import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  GifticonRedemption,
  GifticonRedemptionStatus,
} from '../../../domain/entities/gifticon-redemption.entity';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { UserProfile } from '../../../../user/domain/entities/user-profile.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../../point/domain/entities/point-transaction.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { buildFullUrl } from '../../../../../shared/utils/url.util';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface RejectRedemptionCommand {
  redemptionId: string;
  adminId: string;
  reason?: string;
}

/**
 * Use case for admin to reject gifticon redemption
 * - Only allow reject if status = pending
 * - Refund points to user
 * - Update status = rejected
 */
@Injectable()
export class RejectRedemptionUseCase {
  private readonly apiServiceUrl: string;

  constructor(
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

  async execute(command: RejectRedemptionCommand): Promise<GifticonRedemption> {
    const redemption = await this.redemptionRepository.findById(command.redemptionId);

    if (!redemption) {
      throw notFound(MessageKeys.REDEMPTION_NOT_FOUND);
    }

    if (redemption.status !== GifticonRedemptionStatus.PENDING) {
      throw badRequest(MessageKeys.ONLY_PENDING_REDEMPTIONS_CAN_BE_REJECTED);
    }

    // Execute refund and status update in transaction
    const updatedRedemption = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        // Reload user profile with pessimistic lock to prevent race condition
        const userProfileRepo = manager.getRepository(UserProfile);
        const userProfile = await userProfileRepo.findOne({
          where: { userId: redemption.userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!userProfile) {
          throw notFound(MessageKeys.USER_PROFILE_NOT_FOUND);
        }

        // Refund points to user
        // Ensure points never go negative (safety check)
        const newBalance = Math.max(0, userProfile.points + redemption.pointsUsed);
        userProfile.points = newBalance;
        await userProfileRepo.save(userProfile);

        // Update redemption status = rejected
        const redemptionRepo = manager.getRepository(GifticonRedemption);
        await redemptionRepo.update(command.redemptionId, {
          status: GifticonRedemptionStatus.REJECTED,
          cancelledAt: new Date(),
          cancelledBy: command.adminId,
          cancellationReason: command.reason,
        });

        // Create refund transaction for history
        const pointTransactionRepo = manager.getRepository(PointTransaction);
        const pointTransaction = pointTransactionRepo.create({
          userId: redemption.userId,
          type: PointTransactionType.REFUND,
          amount: redemption.pointsUsed, // Positive for refund
          balanceAfter: newBalance,
          category: 'gifticon_redemption_refund',
          referenceType: 'gifticon_redemption',
          referenceId: redemption.id,
          description: `Gifticon Redemption Refund: ${redemption.gifticonSnapshot?.title || 'Unknown'} ${redemption.pointsUsed}원`,
        });
        await pointTransactionRepo.save(pointTransaction);

        // Get previous points for event
        const previousPoints = userProfile.points - redemption.pointsUsed;

        // Publish point updated event to Redis (after transaction commits)
        const eventData = {
          userId: redemption.userId,
          pointsDelta: redemption.pointsUsed,
          previousPoints: previousPoints,
          newPoints: newBalance,
          transactionType: PointTransactionType.REFUND,
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
                  userId: redemption.userId,
                  redemptionId: command.redemptionId,
                },
                'gifticon',
              );
            });
        });

        // Get updated redemption to return with relations
        const updated = await redemptionRepo.findOne({
          where: { id: command.redemptionId },
          relations: ['user', 'user.userProfile', 'gifticon'],
        });

        if (!updated) {
          throw notFound(MessageKeys.REDEMPTION_NOT_FOUND_AFTER_UPDATE);
        }

        return updated;
      },
    );

    // Reload with relationships for event
    const redemptionWithRelations = await this.redemptionRepository.findById(
      updatedRedemption.id,
      ['user', 'gifticon'],
    );

    if (!redemptionWithRelations) {
      return updatedRedemption;
    }

    // Map redemption to response format (same as admin API response)
    const eventData = this.mapRedemptionToResponse(redemptionWithRelations);

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.REDEMPTION_REJECTED as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish redemption:rejected event',
            {
              error: error instanceof Error ? error.message : String(error),
              redemptionId: updatedRedemption.id,
              adminId: command.adminId,
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
