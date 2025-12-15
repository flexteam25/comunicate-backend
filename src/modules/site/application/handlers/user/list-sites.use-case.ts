import { Injectable, Inject } from '@nestjs/common';
import { ISiteRepository, SiteFilters } from '../../../infrastructure/persistence/repositories/site.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { Site, SiteStatus } from '../../../domain/entities/site.entity';

export interface ListSitesCommand {
  filters?: Omit<SiteFilters, 'status'>;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ListSitesUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: ListSitesCommand): Promise<CursorPaginationResult<Site>> {
    // Only return verified or monitored sites for users
    const filters: SiteFilters = {
      ...command.filters,
      status: `${SiteStatus.VERIFIED},${SiteStatus.MONITORED}`,
    };

    return this.siteRepository.findAllWithCursor(
      filters,
      command.cursor,
      command.limit || 20,
      command.sortBy || 'createdAt',
      command.sortOrder || 'DESC',
    );
  }
}

