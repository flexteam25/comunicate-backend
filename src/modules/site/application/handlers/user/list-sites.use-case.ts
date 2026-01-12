import { Injectable, Inject } from '@nestjs/common';
import {
  ISiteRepository,
  SiteFilters,
} from '../../../infrastructure/persistence/repositories/site.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { Site, SiteStatus } from '../../../domain/entities/site.entity';
import { IUserSearchSiteRepository } from '../../../../user/infrastructure/persistence/repositories/user-search-site.repository';
import { LoggerService } from '../../../../../shared/logger/logger.service';

export interface ListSitesCommand {
  filters?: Omit<SiteFilters, 'status'>;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  userId?: string;
}

@Injectable()
export class ListSitesUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
    @Inject('IUserSearchSiteRepository')
    private readonly searchHistoryRepository: IUserSearchSiteRepository,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: ListSitesCommand): Promise<CursorPaginationResult<Site>> {
    // Only return verified or monitored sites for users
    const filters: SiteFilters = {
      ...command.filters,
      status: `${SiteStatus.VERIFIED},${SiteStatus.MONITORED}`,
    };

    // Save search history if user is authenticated and search query exists
    if (command.userId && command.filters?.search && command.filters.search.trim().length > 0) {
      // Don't wait for search history save (async, non-blocking)
      this.searchHistoryRepository
        .addSearchHistory(command.userId, command.filters.search)
        .catch((error) => {
          // Log error but don't fail the request
          this.logger.error(
            'Failed to save search history',
            {
              error: error instanceof Error ? error.message : String(error),
              userId: command.userId,
              searchQuery: command.filters.search,
            },
            'site',
          );
        });
    }

    return this.siteRepository.findAllWithCursor(
      filters,
      command.cursor,
      command.limit ? (Number(command.limit) < 50 ? Number(command.limit) : 50) : 20,
      command.sortBy || 'createdAt',
      command.sortOrder || 'DESC',
    );
  }
}
