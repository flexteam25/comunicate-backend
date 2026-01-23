import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  PointExchange,
  PointExchangeStatus,
} from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { IUserRepository } from '../../../../user/infrastructure/persistence/repositories/user.repository';
import { UserProfile } from '../../../../user/domain/entities/user-profile.entity';
import { TransactionService } from '../../../../../shared/services/transaction.service';
import {
  PointTransaction,
  PointTransactionType,
} from '../../../domain/entities/point-transaction.entity';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import {
  notFound,
  badRequest,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface CancelExchangeCommand {
  exchangeId: string;
  userId: string;
}

/**
 * Use case for user to cancel point exchange request
 * - Only allow cancel if status = pending or processing
 * - Only allow user to cancel their own exchange
 * - Refund points to user
 * - Update status = cancelled
 */
@Injectable()
export class CancelExchangeUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: CancelExchangeCommand): Promise<PointExchange> {
    const exchange = await this.pointExchangeRepository.findById(command.exchangeId, [
      'site',
    ]);

    if (!exchange) {
      throw notFound(MessageKeys.EXCHANGE_NOT_FOUND);
    }

    if (exchange.userId !== command.userId) {
      throw forbidden(MessageKeys.CAN_ONLY_CANCEL_OWN_EXCHANGES);
    }

    if (
      exchange.status !== PointExchangeStatus.PENDING &&
      exchange.status !== PointExchangeStatus.PROCESSING
    ) {
      throw badRequest(MessageKeys.ONLY_PENDING_OR_PROCESSING_EXCHANGES_CAN_BE_CANCELLED);
    }

    // Execute refund and status update in transaction
    const updatedExchange = await this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        // Reload user profile with pessimistic lock to prevent race condition
        const userProfileRepo = manager.getRepository(UserProfile);
        const userProfile = await userProfileRepo.findOne({
          where: { userId: exchange.userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!userProfile) {
          throw notFound(MessageKeys.USER_PROFILE_NOT_FOUND);
        }

        // Refund points to user
        // Ensure points never go negative (safety check)
        const newBalance = Math.max(0, userProfile.points + exchange.pointsAmount);
        userProfile.points = newBalance;
        await userProfileRepo.save(userProfile);

        // Update exchange status = cancelled
        const exchangeRepo = manager.getRepository(PointExchange);
        await exchangeRepo.update(command.exchangeId, {
          status: PointExchangeStatus.CANCELLED,
        });

        // Create refund transaction for history
        const pointTransactionRepo = manager.getRepository(PointTransaction);
        const pointTransaction = pointTransactionRepo.create({
          userId: exchange.userId,
          type: PointTransactionType.REFUND,
          amount: exchange.pointsAmount, // Positive for refund
          balanceAfter: newBalance,
          category: 'point_exchange_refund',
          referenceType: 'point_exchange',
          referenceId: exchange.id,
          description: `Point Exchange Refund: ${exchange.site?.name || 'Unknown'} ${exchange.pointsAmount}원`,
        });
        await pointTransactionRepo.save(pointTransaction);

        // Get previous points for event
        const previousPoints = userProfile.points - exchange.pointsAmount;

        // Publish point updated event to Redis (after transaction commits)
        const eventData = {
          userId: exchange.userId,
          pointsDelta: exchange.pointsAmount,
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
                  userId: exchange.userId,
                  exchangeId: command.exchangeId,
                },
                'point',
              );
            });
        });

        // Get updated exchange to return
        const updated = await exchangeRepo.findOne({
          where: { id: command.exchangeId },
        });

        if (!updated) {
          throw notFound(MessageKeys.EXCHANGE_NOT_FOUND_AFTER_UPDATE);
        }

        return updated;
      },
    );

    // Reload with relationships for admin event
    const exchangeWithRelations = await this.pointExchangeRepository.findById(
      updatedExchange.id,
      ['user', 'site', 'admin'],
    );

    if (!exchangeWithRelations) {
      return updatedExchange;
    }

    // Map exchange to response format (same as admin API response)
    const adminEventData = this.mapExchangeToResponse(exchangeWithRelations);

    // Publish event to admin room (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.EXCHANGE_CANCELLED as string, adminEventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish exchange:cancelled event',
            {
              error: error instanceof Error ? error.message : String(error),
              exchangeId: updatedExchange.id,
              userId: command.userId,
            },
            'point',
          );
        });
    });

    return exchangeWithRelations;
  }

  private mapExchangeToResponse(exchange: any): any {
    return {
      id: exchange.id,
      userId: exchange.userId,
      user: exchange.user
        ? {
            id: exchange.user.id,
            email: exchange.user.email,
            displayName: exchange.user.displayName || null,
          }
        : null,
      siteId: exchange.siteId,
      site: exchange.site
        ? {
            id: exchange.site.id,
            name: exchange.site.name,
            slug: exchange.site.slug || null,
          }
        : null,
      pointsAmount: exchange.pointsAmount,
      siteCurrencyAmount: Number(exchange.siteCurrencyAmount),
      exchangeRate: exchange.exchangeRate ? Number(exchange.exchangeRate) : null,
      siteUserId: exchange.siteUserId,
      status: exchange.status,
      adminId: exchange.adminId || null,
      admin: exchange.admin
        ? {
            id: exchange.admin.id,
            email: exchange.admin.email,
            displayName: exchange.admin.displayName || null,
          }
        : null,
      processedAt: exchange.processedAt || null,
      rejectionReason: exchange.rejectionReason || null,
      createdAt: exchange.createdAt,
      updatedAt: exchange.updatedAt,
    };
  }
}
