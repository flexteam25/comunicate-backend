import { Injectable, Inject } from '@nestjs/common';
import {
  ISiteRepository,
  SiteFilters,
} from '../../../infrastructure/persistence/repositories/site.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { Site } from '../../../domain/entities/site.entity';

export interface ListTrashSitesCommand {
  filters?: SiteFilters;
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class ListTrashSitesUseCase {
  constructor(
    @Inject('ISiteRepository')
    private readonly siteRepository: ISiteRepository,
  ) {}

  async execute(command: ListTrashSitesCommand): Promise<CursorPaginationResult<Site>> {
    return this.siteRepository.findAllDeletedWithCursor(
      command.filters,
      command.cursor,
      command.limit || 20,
      command.sortBy || 'createdAt',
      command.sortOrder || 'DESC',
    );
  }
}
