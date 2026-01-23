import { Injectable, Inject } from '@nestjs/common';
import {
  ISiteRequestRepository,
  SiteRequestFilters,
} from '../../../infrastructure/persistence/repositories/site-request.repository';
import {
  SiteRequest,
  SiteRequestStatus,
} from '../../../domain/entities/site-request.entity';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListSiteRequestsCommand {
  status?: SiteRequestStatus;
  userName?: string;
  startDate?: Date;
  endDate?: Date;
  cursor?: string;
  limit?: number;
}

export interface ListSiteRequestsResult {
  requests: SiteRequest[];
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class ListSiteRequestsUseCase {
  constructor(
    @Inject('ISiteRequestRepository')
    private readonly siteRequestRepository: ISiteRequestRepository,
  ) {}

  async execute(command: ListSiteRequestsCommand): Promise<ListSiteRequestsResult> {
    const filters: SiteRequestFilters = {
      status: command.status,
      userName: command.userName,
      startDate: command.startDate,
      endDate: command.endDate,
    };

    const result = await this.siteRequestRepository.findAll(
      filters,
      command.cursor,
      command.limit || 20,
    );

    return {
      requests: result.data,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  }
}
