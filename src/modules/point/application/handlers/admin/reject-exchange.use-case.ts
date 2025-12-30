import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
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

/**
 * Command for admin to reject point exchange request
 */
export interface RejectExchangeCommand {
  exchangeId: string;
  adminId: string;
  /** Rejection reason (optional) */
  reason?: string;
}

/**
 * Use case for admin to reject point exchange request
 * - Only allow reject if status = pending or processing
 * - Refund points to user
 * - Update status = rejected
 * - Create refund transaction
 */
@Injectable()
export class RejectExchangeUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Execute rejection of point exchange request and refund points to user
   * All operations are performed within a transaction to ensure data consistency
   */
  async execute(command: RejectExchangeCommand): Promise<PointExchange> {
    // Check exchange exists
    const exchange = await this.pointExchangeRepository.findById(command.exchangeId, [
      'site',
    ]);

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    // Only allow reject if status = pending or processing
    if (
      exchange.status !== PointExchangeStatus.PENDING &&
      exchange.status !== PointExchangeStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Only pending or processing exchanges can be rejected',
      );
    }

    // Execute refund and status update in transaction
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        // Reload user profile with pessimistic lock to prevent race condition
        const userProfileRepo = manager.getRepository(UserProfile);
        const userProfile = await userProfileRepo.findOne({
          where: { userId: exchange.userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!userProfile) {
          throw new NotFoundException('User profile not found');
        }

        // Refund points to user
        const newBalance = userProfile.points + exchange.pointsAmount;
        userProfile.points = newBalance;
        await userProfileRepo.save(userProfile);

        // Update exchange status = rejected
        const exchangeRepo = manager.getRepository(PointExchange);
        await exchangeRepo.update(command.exchangeId, {
          status: PointExchangeStatus.REJECTED,
          adminId: command.adminId,
          processedAt: new Date(),
          rejectionReason: command.reason,
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
        const updatedExchange = await exchangeRepo.findOne({
          where: { id: command.exchangeId },
        });

        if (!updatedExchange) {
          throw new NotFoundException('Exchange not found after update');
        }

        return updatedExchange;
      },
    );
  }
}
