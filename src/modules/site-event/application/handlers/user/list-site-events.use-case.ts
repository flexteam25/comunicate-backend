import { Injectable, Inject } from '@nestjs/common';
import { ISiteEventRepository } from '../../../infrastructure/persistence/repositories/site-event.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { SiteEvent } from '../../../domain/entities/site-event.entity';

export interface ListSiteEventsCommand {
  siteId: string;
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
    return this.siteEventRepository.findBySiteId(
      command.siteId,
      command.cursor,
      command.limit,
    );
  }
}
