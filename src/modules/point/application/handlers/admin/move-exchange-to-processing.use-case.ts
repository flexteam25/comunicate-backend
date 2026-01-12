import { Injectable, Inject } from '@nestjs/common';
import {
  PointExchange,
  PointExchangeStatus,
} from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';
import {
  notFound,
  badRequest,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface MoveExchangeToProcessingCommand {
  exchangeId: string;
  adminId: string;
  managerId?: string;
}

@Injectable()
export class MoveExchangeToProcessingUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: MoveExchangeToProcessingCommand): Promise<PointExchange> {
    const exchange = await this.pointExchangeRepository.findById(command.exchangeId);

    if (!exchange) {
      throw notFound(MessageKeys.EXCHANGE_NOT_FOUND);
    }

    if (exchange.status !== PointExchangeStatus.PENDING) {
      throw badRequest(MessageKeys.ONLY_PENDING_EXCHANGES_CAN_BE_MOVED_TO_PROCESSING);
    }

    const updateData: Partial<PointExchange> = {
      status: PointExchangeStatus.PROCESSING,
      adminId: command.adminId,
      processedAt: new Date(),
    };

    // If managerId is provided, also set it (manager moved to processing)
    if (command.managerId) {
      updateData.managerId = command.managerId;
    }

    await this.pointExchangeRepository.update(command.exchangeId, updateData);

    // Reload with relationships for response
    const updatedExchange = await this.pointExchangeRepository.findById(
      command.exchangeId,
      ['user', 'site', 'admin', 'manager'],
    );

    if (!updatedExchange) {
      throw notFound(MessageKeys.EXCHANGE_NOT_FOUND_AFTER_UPDATE);
    }

    // Map exchange to response format (same as admin API response)
    const eventData = this.mapExchangeToResponse(updatedExchange);

    // Publish event after transaction (fire and forget)
    setImmediate(() => {
      this.redisService
        .publishEvent(RedisChannel.EXCHANGE_PROCESSING as string, eventData)
        .catch((error) => {
          this.logger.error(
            'Failed to publish exchange:processing event',
            {
              error: error instanceof Error ? error.message : String(error),
              exchangeId: updatedExchange.id,
              adminId: command.adminId,
            },
            'point',
          );
        });
    });

    return updatedExchange;
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
