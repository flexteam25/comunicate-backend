import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import {
  PointExchange,
  PointExchangeStatus,
} from '../../../domain/entities/point-exchange.entity';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import { RedisService } from '../../../../../shared/redis/redis.service';
import { RedisChannel } from '../../../../../shared/socket/socket-channels';
import { LoggerService } from '../../../../../shared/logger/logger.service';

export interface ManagerMoveExchangeToProcessingCommand {
  exchangeId: string;
  siteIdOrSlug: string;
  managerUserId: string;
}

@Injectable()
export class ManagerMoveExchangeToProcessingUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    private readonly redisService: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async execute(
    command: ManagerMoveExchangeToProcessingCommand,
  ): Promise<PointExchange> {
    const exchange = await this.pointExchangeRepository.findById(command.exchangeId, ['site']);

    if (!exchange) {
      throw new NotFoundException('Exchange not found');
    }

    // Resolve site by ID or slug
    const site = await this.siteRepository.findByIdOrSlug(command.siteIdOrSlug);

    if (!site) {
      throw new NotFoundException('Site not found');
    }

    // Verify exchange belongs to this site
    if (exchange.siteId !== site.id) {
      throw new BadRequestException('Exchange does not belong to this site');
    }

    // Check if user is manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      site.id,
      command.managerUserId,
    );

    if (!manager) {
      throw new ForbiddenException(
        'You do not have permission to move exchanges to processing for this site',
      );
    }

    if (exchange.status !== PointExchangeStatus.PENDING) {
      throw new BadRequestException('Only pending exchanges can be moved to processing');
    }

    await this.pointExchangeRepository.update(command.exchangeId, {
      status: PointExchangeStatus.PROCESSING,
      managerId: command.managerUserId,
      processedAt: new Date(),
    });

    // Reload with relationships for response
    const updatedExchange = await this.pointExchangeRepository.findById(
      command.exchangeId,
      ['user', 'site', 'admin', 'manager'],
    );

    if (!updatedExchange) {
      throw new NotFoundException('Exchange not found after update');
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
              managerUserId: command.managerUserId,
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

