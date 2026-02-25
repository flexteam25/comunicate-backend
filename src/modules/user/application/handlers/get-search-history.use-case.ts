import { Inject, Injectable } from '@nestjs/common';
import { IUserSearchSiteRepository } from '../../infrastructure/persistence/repositories/user-search-site.repository';

export interface GetSearchHistoryCommand {
  userId: string;
  cursor?: string;
  limit?: number;
}

export interface SearchHistoryResult {
  searchQuery: string;
  createdAt: Date;
}

export interface GetSearchHistoryResult {
  data: SearchHistoryResult[];
  nextCursor: string | null;
  prevCursor: string | null;
}

@Injectable()
export class GetSearchHistoryUseCase {
  constructor(
    @Inject('IUserSearchSiteRepository')
    private readonly searchHistoryRepository: IUserSearchSiteRepository,
  ) {}

  async execute(command: GetSearchHistoryCommand): Promise<GetSearchHistoryResult> {
    const limit = command.limit && command.limit > 0 ? command.limit : 20;
    return this.searchHistoryRepository.findRecentSearchHistory(
      command.userId,
      command.cursor,
      limit,
    );
  }
}
