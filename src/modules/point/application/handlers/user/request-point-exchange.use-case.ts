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
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
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
 * Command to request point exchange to site currency
 */
export interface RequestPointExchangeCommand {
  userId: string;
  siteId: string;
  /** Points amount to exchange (must be >= 10,000 and multiple of 10,000) */
  pointsAmount: number;
  /** User ID on partner site */
  siteUserId: string;
}

/**
 * Use case for user to request point exchange to partner site currency
 * - Validate site exists
 * - Validate: pointsAmount >= 10,000, multiple of 10,000
 * - Check user has sufficient points
 * - Deduct points from userProfile.points
 * - Create point_exchange record (status = pending)
 * - Create point_transaction record (type = spend)
 * - Exchange rate: 1 point = 1 KRW (temporarily)
 */
@Injectable()
export class RequestPointExchangeUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Execute point exchange request to site currency
   * All operations are performed within a transaction to ensure data consistency
   */
  async execute(command: RequestPointExchangeCommand): Promise<PointExchange> {
    // Check site exists
    const site = await this.siteRepository.findById(command.siteId);
    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Validate exchange amount: minimum 10,000 points
    if (command.pointsAmount < 10000) {
      throw new BadRequestException('Minimum exchange amount is 10,000 points');
    }

    // Validate points must be multiple of 10,000 (만원 단위)
    if (command.pointsAmount % 10000 !== 0) {
      throw new BadRequestException('Exchange amount must be a multiple of 10,000');
    }

    // Check user has sufficient points (preliminary check before transaction)
    const user = await this.userRepository.findById(command.userId, ['userProfile']);
    if (!user || !user.userProfile) {
      throw new NotFoundException('User not found');
    }

    if (user.userProfile.points < command.pointsAmount) {
      throw new BadRequestException('Insufficient points');
    }

    // Execute all operations in transaction to ensure data consistency
    return this.transactionService.executeInTransaction(
      async (manager: EntityManager) => {
        // Reload user profile with pessimistic lock to prevent race condition
        const userProfileRepo = manager.getRepository(UserProfile);
        const userProfile = await userProfileRepo.findOne({
          where: { userId: command.userId },
          lock: { mode: 'pessimistic_write' },
        });

        // Recheck balance after lock
        if (!userProfile || userProfile.points < command.pointsAmount) {
          throw new BadRequestException('Insufficient points');
        }

        // Calculate new balance after deducting points
        const newBalance = userProfile.points - command.pointsAmount;

        // Update user points
        userProfile.points = newBalance;
        await userProfileRepo.save(userProfile);

        // Calculate site currency amount (exchange rate: 1 point = 1 KRW)
        const siteCurrencyAmount = command.pointsAmount;
        const exchangeRate = 1.0;

        // Create exchange record with status = pending (requires admin processing)
        const exchangeRepo = manager.getRepository(PointExchange);
        const exchange = exchangeRepo.create({
          userId: command.userId,
          siteId: command.siteId,
          pointsAmount: command.pointsAmount,
          siteCurrencyAmount,
          exchangeRate,
          siteUserId: command.siteUserId,
          status: PointExchangeStatus.PENDING,
        });
        const savedExchange = await exchangeRepo.save(exchange);

        // Create point transaction for history
        const pointTransactionRepo = manager.getRepository(PointTransaction);
        const pointTransaction = pointTransactionRepo.create({
          userId: command.userId,
          type: PointTransactionType.SPEND,
          amount: -command.pointsAmount, // Negative for spend
          balanceAfter: newBalance,
          category: 'point_exchange',
          referenceType: 'point_exchange',
          referenceId: savedExchange.id,
          description: `Point Exchange: ${site.name} ${command.pointsAmount}원`,
        });
        await pointTransactionRepo.save(pointTransaction);

        // Get previous points for event
        const previousPoints = userProfile.points + command.pointsAmount;

        // Publish point updated event to Redis (after transaction commits)
        const eventData = {
          userId: command.userId,
          pointsDelta: -command.pointsAmount,
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
                  exchangeId: savedExchange.id,
                },
                'point',
              );
            });
        });

        return savedExchange;
      },
    );
  }
}
