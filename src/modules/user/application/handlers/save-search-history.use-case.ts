import { Inject, Injectable } from '@nestjs/common';
import { IUserSearchSiteRepository } from '../../infrastructure/persistence/repositories/user-search-site.repository';
import { LoggerService } from '../../../../shared/logger/logger.service';

export interface SaveSearchHistoryCommand {
  userId: string;
  searchQuery: string;
}

@Injectable()
export class SaveSearchHistoryUseCase {
  constructor(
    @Inject('IUserSearchSiteRepository')
    private readonly searchHistoryRepository: IUserSearchSiteRepository,
    private readonly logger: LoggerService,
  ) {}

  async execute(command: SaveSearchHistoryCommand): Promise<void> {
    if (!command.userId || !command.searchQuery || command.searchQuery.trim().length === 0) {
      return;
    }

    try {
      await this.searchHistoryRepository.addSearchHistory(
        command.userId,
        command.searchQuery,
      );
    } catch (error) {
      // Log error but don't fail the request
      this.logger.error(
        'Failed to save search history',
        {
          error: error instanceof Error ? error.message : String(error),
          userId: command.userId,
          searchQuery: command.searchQuery,
        },
        'user',
      );
    }
  }
}
