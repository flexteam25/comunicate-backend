import { Injectable, Inject } from '@nestjs/common';
import { SiteManagerApplication } from '../../../domain/entities/site-manager-application.entity';
import { SiteManagerApplicationStatus } from '../../../domain/entities/site-manager-application.entity';
import { ISiteManagerApplicationRepository } from '../../../infrastructure/persistence/repositories/site-manager-application.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListMyApplicationsCommand {
  userId: string;
  status?: SiteManagerApplicationStatus;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListMyApplicationsUseCase {
  constructor(
    @Inject('ISiteManagerApplicationRepository')
    private readonly applicationRepository: ISiteManagerApplicationRepository,
  ) {}

  async execute(
    command: ListMyApplicationsCommand,
  ): Promise<CursorPaginationResult<SiteManagerApplication>> {
    return this.applicationRepository.findByUserId(
      command.userId,
      command.status,
      command.cursor,
      command.limit,
    );
  }
}
