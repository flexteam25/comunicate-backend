import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import {
  PointExchange,
  PointExchangeStatus,
} from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
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
import {
  notFound,
  badRequest,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface ManagerRejectExchangeCommand {
  exchangeId: string;
  siteIdOrSlug: string;
  managerUserId: string;
  reason?: string;
}

@Injectable()
export class ManagerRejectExchangeUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly transactionService: TransactionService,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: ManagerRejectExchangeCommand): Promise<PointExchange> {
    const exchange = await this.pointExchangeRepository.findById(command.exchangeId, [
      'site',
    ]);

    if (!exchange) {
      throw notFound(MessageKeys.EXCHANGE_NOT_FOUND);
    }

    // Resolve site by ID or slug
    const site = await this.siteRepository.findByIdOrSlug(command.siteIdOrSlug);

    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    // Verify exchange belongs to this site
    if (exchange.siteId !== site.id) {
      throw badRequest(MessageKeys.EXCHANGE_DOES_NOT_BELONG_TO_SITE);
    }

    // Check if user is manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      site.id,
      command.managerUserId,
    );

    if (!manager) {
      throw forbidden(MessageKeys.NO_PERMISSION_TO_REJECT_EXCHANGES);
    }

    // Only allow reject if status = pending or processing
    if (
      exchange.status !== PointExchangeStatus.PENDING &&
      exchange.status !== PointExchangeStatus.PROCESSING
    ) {
      throw badRequest(MessageKeys.ONLY_PENDING_OR_PROCESSING_EXCHANGES_CAN_BE_REJECTED);
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
        const newBalance = userProfile.points + exchange.pointsAmount;
        userProfile.points = newBalance;
        await userProfileRepo.save(userProfile);

        // Update exchange status = rejected
        const exchangeRepo = manager.getRepository(PointExchange);
        await exchangeRepo.update(command.exchangeId, {
          status: PointExchangeStatus.REJECTED,
          managerId: command.managerUserId,
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
        const updated = await exchangeRepo.findOne({
          where: { id: command.exchangeId },
        });

        if (!updated) {
          throw notFound(MessageKeys.EXCHANGE_NOT_FOUND_AFTER_UPDATE);
        }

        return updated;
      },
    );

    // Reload with relationships for event
    const exchangeWithRelations = await this.pointExchangeRepository.findById(
      updatedExchange.id,
      ['user', 'site', 'admin', 'manager'],
    );

    if (!exchangeWithRelations) {
      return updatedExchange;
    }

    // Map exchange to response format (same as admin API response)
    const eventData = this.mapExchangeToResponse(exchangeWithRelations);

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.EXCHANGE_REJECTED as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish exchange:rejected event',
            {
              error: error instanceof Error ? error.message : String(error),
              exchangeId: updatedExchange.id,
              managerUserId: command.managerUserId,
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
      managerId: exchange.managerId || null,
      manager: exchange.manager
        ? {
            id: exchange.manager.id,
            email: exchange.manager.email,
            displayName: exchange.manager.displayName || null,
          }
        : null,
      processedAt: exchange.processedAt || null,
      rejectionReason: exchange.rejectionReason || null,
      createdAt: exchange.createdAt,
      updatedAt: exchange.updatedAt,
    };
  }
}
