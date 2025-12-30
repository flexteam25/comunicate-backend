import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  ForbiddenException,
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
      throw new NotFoundException('Exchange not found');
    }

    if (exchange.userId !== command.userId) {
      throw new ForbiddenException('You can only cancel your own exchanges');
    }

    if (
      exchange.status !== PointExchangeStatus.PENDING &&
      exchange.status !== PointExchangeStatus.PROCESSING
    ) {
      throw new BadRequestException(
        'Only pending or processing exchanges can be cancelled',
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
