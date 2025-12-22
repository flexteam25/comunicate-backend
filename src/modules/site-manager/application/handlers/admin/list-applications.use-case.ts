import { Injectable, Inject } from '@nestjs/common';
import { SiteManagerApplication } from '../../../domain/entities/site-manager-application.entity';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';
import { ISiteManagerApplicationRepository } from '../../../infrastructure/persistence/repositories/site-manager-application.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListApplicationsCommand {
  siteName?: string;
  status?: SiteManagerApplicationStatus;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListApplicationsUseCase {
  constructor(
    @Inject('ISiteManagerApplicationRepository')
    private readonly applicationRepository: ISiteManagerApplicationRepository,
  ) {}

  async execute(
    command: ListApplicationsCommand,
  ): Promise<CursorPaginationResult<SiteManagerApplication>> {
    return this.applicationRepository.findAll(
      {
        siteName: command.siteName,
        status: command.status,
      },
      command.cursor,
      command.limit,
    );
  }
}
