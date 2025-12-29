import { Injectable, Inject } from '@nestjs/common';
import { ISiteEventRepository } from '../../../infrastructure/persistence/repositories/site-event.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { SiteEvent } from '../../../domain/entities/site-event.entity';

export interface ListSiteEventsCommand {
  siteName?: string;
  userName?: string;
  adminName?: string;
  isActive?: boolean;
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListSiteEventsUseCase {
  constructor(
    @Inject('ISiteEventRepository')
    private readonly siteEventRepository: ISiteEventRepository,
  ) {}

  async execute(
    command: ListSiteEventsCommand,
  ): Promise<CursorPaginationResult<SiteEvent>> {
    return this.siteEventRepository.findAll(
      {
        siteName: command.siteName,
        userName: command.userName,
        adminName: command.adminName,
        isActive: command.isActive,
        search: command.search,
        sortBy: command.sortBy,
        sortOrder: command.sortOrder,
      },
      command.cursor,
      command.limit,
    );
  }
}
