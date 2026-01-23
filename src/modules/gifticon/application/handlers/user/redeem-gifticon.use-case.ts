import { Injectable, Inject } from '@nestjs/common';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';
import { EntityManager } from 'typeorm';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';
import {
  GifticonRedemption,
  GifticonRedemptionStatus,
} from '../../../domain/entities/gifticon-redemption.entity';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { UserProfile } from '../../../../user/domain/entities/user-profile.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { randomUUID } from 'crypto';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';

/**
 * Command to redeem gifticon
 */
export interface RedeemGifticonCommand {
  userId: string;
  gifticonId: string;
  /** Client IP address when user redeemed the gifticon */
  ipAddress?: string;
}

/**
 * Use case for user to redeem gifticon with points
 * - Validate gifticon (status = published, within valid period)
 * - Check user has sufficient points
 * - Deduct points from userProfile.points
 * - Create gifticon_redemption record (status = pending)
 * - Create point_transaction record (type = spend)
 * - Generate redemption_code (UUID format)
 * - Save gifticon_snapshot
 */
@Injectable()
export class RedeemGifticonUseCase {
  private readonly apiServiceUrl: string;

  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
    @Inject('IGifticonRedemptionRepository')
    private readonly redemptionRepository: IGifticonRedemptionRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
  ) {
    this.apiServiceUrl = this.configService.get<string>('API_SERVICE_URL') || '';
  }

  /**
   * Execute gifticon redemption with points
   * All operations are performed within a transaction to ensure data consistency
   */
  async execute(command: RedeemGifticonCommand): Promise<GifticonRedemption> {
    // Check gifticon exists
    const gifticon = await this.gifticonRepository.findById(command.gifticonId);
    if (!gifticon) {
      throw notFound(MessageKeys.GIFTICON_NOT_FOUND);
    }

    // Check gifticon has status = published
    if (gifticon.status !== GifticonStatus.PUBLISHED) {
      throw badRequest(MessageKeys.GIFTICON_NOT_AVAILABLE_FOR_REDEMPTION);
    }

    // Check gifticon is within valid period
    const now = new Date();
    if (gifticon.startsAt && gifticon.startsAt > now) {
      throw badRequest(MessageKeys.GIFTICON_HAS_NOT_STARTED);
    }

    if (gifticon.endsAt && gifticon.endsAt < now) {
      throw badRequest(MessageKeys.GIFTICON_HAS_EXPIRED);
    }

    // Check user has sufficient points (preliminary check before transaction)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user || !user.userProfile) {
      throw notFound(MessageKeys.USER_NOT_FOUND);
    }

    if (user.userProfile.points < gifticon.amount) {
      throw badRequest(MessageKeys.INSUFFICIENT_POINTS);
    }

    // Execute all operations in transaction to ensure data consistency
    const savedRedemption = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        // Reload user profile with pessimistic lock to prevent race condition
        const userProfileRepo = manager.getRepository(UserProfile);
        const userProfile = await userProfileRepo.findOne({
          where: { userId: command.userId },
          lock: { mode: 'pessimistic_write' },
        });

        // Recheck balance after lock (in case points were deducted while waiting)
        if (!userProfile || userProfile.points < gifticon.amount) {
          throw badRequest(MessageKeys.INSUFFICIENT_POINTS);
        }

        // Calculate new balance after deducting points
        // Ensure points never go negative (safety check)
        const newBalance = Math.max(0, userProfile.points - gifticon.amount);

        // Update user points
        userProfile.points = newBalance;
        await userProfileRepo.save(userProfile);

        // Create redemption record with status = pending (requires admin approval)
        const redemptionRepo = manager.getRepository(GifticonRedemption);
        const redemption = redemptionRepo.create({
          userId: command.userId,
          gifticonId: command.gifticonId,
          pointsUsed: gifticon.amount,
          status: GifticonRedemptionStatus.PENDING,
          redemptionCode: randomUUID(), // Generate UUID format
          ipAddress: command.ipAddress || null,
          // Save snapshot to ensure data integrity if gifticon is edited
          gifticonSnapshot: {
            title: gifticon.title,
            amount: gifticon.amount,
            imageUrl: gifticon.imageUrl,
            summary: gifticon.summary,
            typeColor: gifticon.typeColor,
          },
        });
        const saved = await redemptionRepo.save(redemption);

        // Create point transaction for history
        const pointTransactionRepo = manager.getRepository(PointTransaction);
        const pointTransaction = pointTransactionRepo.create({
          userId: command.userId,
          type: PointTransactionType.SPEND,
          amount: -gifticon.amount, // Negative for spend
          balanceAfter: newBalance,
          category: 'gifticon_redemption',
          referenceType: 'gifticon_redemption',
          referenceId: saved.id,
          description: `Gifticon: ${gifticon.title} ${gifticon.amount}원`,
        });
        await pointTransactionRepo.save(pointTransaction);

        // Get previous points for event
        const previousPoints = userProfile.points + gifticon.amount;

        // Publish point updated event to Redis (after transaction commits)
        const eventData = {
          userId: command.userId,
          pointsDelta: -gifticon.amount,
          previousPoints: previousPoints,
          newPoints: newBalance,
          transactionType: PointTransactionType.SPEND,
          updatedAt: new Date(),
        };

        // Publish event after transaction (fire and forget)
        setImmediate(() => {
          this.redisService
            .publishEvent(RedisChannel.POINT_UPDATED as string, eventData)
            .catch((error) => {
              this.logger.error(
                'Failed to publish point:updated event',
                {
                  error: error instanceof Error ? error.message : String(error),
                  userId: command.userId,
                  redemptionId: saved.id,
                },
                'gifticon',
              );
            });
        });

        return saved;
      },
    );

    // Reload with relationships for admin event
    const redemptionWithRelations = await this.redemptionRepository.findById(
      savedRedemption.id,
      ['user', 'gifticon'],
    );

    if (!redemptionWithRelations) {
      return savedRedemption;
    }

    // Map redemption to response format (same as admin API response)
    const adminEventData = this.mapRedemptionToResponse(redemptionWithRelations);

    // Publish event to admin room (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.REDEMPTION_CREATED as string, adminEventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish redemption:created event',
            {
              error: error instanceof Error ? error.message : String(error),
              redemptionId: savedRedemption.id,
              userId: command.userId,
            },
            'gifticon',
          );
        });
    });

    return redemptionWithRelations;
  }

  private mapRedemptionToResponse(redemption: any): any {
    return {
      id: redemption.id,
      userId: redemption.userId,
      user: redemption.user
        ? {
            id: redemption.user.id,
            email: redemption.user.email,
            displayName: redemption.user.displayName || null,
          }
        : null,
      gifticonId: redemption.gifticonId,
      gifticon: redemption.gifticon
        ? this.mapGifticonToResponse(redemption.gifticon)
        : redemption.gifticonSnapshot
          ? {
              title: redemption.gifticonSnapshot.title,
              amount: redemption.gifticonSnapshot.amount,
              imageUrl: redemption.gifticonSnapshot.imageUrl
                ? buildFullUrl(this.apiServiceUrl, redemption.gifticonSnapshot.imageUrl)
                : null,
              summary: redemption.gifticonSnapshot.summary || null,
              typeColor: redemption.gifticonSnapshot.typeColor || null,
            }
          : null,
      pointsUsed: redemption.pointsUsed,
      status: redemption.status,
      redemptionCode: redemption.redemptionCode || null,
      cancelledAt: redemption.cancelledAt || null,
      cancellationReason: redemption.cancellationReason || null,
      createdAt: redemption.createdAt,
      updatedAt: redemption.updatedAt,
    };
  }

  private mapGifticonToResponse(gifticon: any): any {
    return {
      id: gifticon.id,
      title: gifticon.title,
      slug: gifticon.slug || null,
      summary: gifticon.summary || null,
      content: gifticon.content,
      status: gifticon.status,
      amount: gifticon.amount,
      typeColor: gifticon.typeColor || null,
      startsAt: gifticon.startsAt || null,
      endsAt: gifticon.endsAt || null,
      imageUrl: buildFullUrl(this.apiServiceUrl, gifticon.imageUrl || null) || null,
      createdAt: gifticon.createdAt,
      updatedAt: gifticon.updatedAt,
    };
  }
}
