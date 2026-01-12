import { Injectable, Inject } from '@nestjs/common';
import { IPointExchangeRepository } from '../../../infrastructure/persistence/repositories/point-exchange.repository';
import { ISiteManagerRepository } from '../../../../site-manager/infrastructure/persistence/repositories/site-manager.repository';
import { ISiteRepository } from '../../../../site/infrastructure/persistence/repositories/site.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { PointExchange } from '../../../domain/entities/point-exchange.entity';
import {
  notFound,
  forbidden,
  MessageKeys,
} from '../../../../../shared/exceptions/exception-helpers';

export interface ListSiteExchangesCommand {
  siteIdOrSlug: string;
  managerUserId: string;
  status?: string;
  userName?: string;
  startDate?: Date;
  endDate?: Date;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListSiteExchangesUseCase {
  constructor(
    @Inject('IPointExchangeRepository')
    private readonly pointExchangeRepository: IPointExchangeRepository,
    @Inject('ISiteManagerRepository')
    private readonly siteManagerRepository: ISiteManagerRepository,
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(
    command: ListSiteExchangesCommand,
  ): Promise<CursorPaginationResult<PointExchange>> {
    // Resolve site by ID or slug
    const site = await this.siteRepository.findByIdOrSlug(command.siteIdOrSlug);

    if (!site) {
      throw notFound(MessageKeys.SITE_NOT_FOUND);
    }

    // Check if user is manager of this site
    const manager = await this.siteManagerRepository.findBySiteAndUser(
      site.id,
      command.managerUserId,
    );

    if (!manager) {
      throw forbidden(MessageKeys.NO_PERMISSION_TO_VIEW_EXCHANGES);
    }

    // List exchanges for this site with filters
    return this.pointExchangeRepository.findAllWithCursor(
      {
        siteId: site.id,
        status: command.status,
        userName: command.userName,
        startDate: command.startDate,
        endDate: command.endDate,
      },
      command.cursor,
      command.limit || 20,
    );
  }
}
