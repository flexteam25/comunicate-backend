import { Inject, Injectable } from '@nestjs/common';
import { IUserSearchSiteRepository } from '../../infrastructure/persistence/repositories/user-search-site.repository';

export interface GetSearchHistoryCommand {
  userId: string;
  limit?: number;
}

export interface SearchHistoryResult {
  searchQuery: string;
  createdAt: Date;
}

@Injectable()
export class GetSearchHistoryUseCase {
  constructor(
    @Inject('IUserSearchSiteRepository')
    private readonly searchHistoryRepository: IUserSearchSiteRepository,
  ) {}

  async execute(command: GetSearchHistoryCommand): Promise<SearchHistoryResult[]> {
    const limit = command.limit && command.limit > 0 ? command.limit : 20;
    return this.searchHistoryRepository.findRecentSearchHistory(command.userId, limit);
  }
}
