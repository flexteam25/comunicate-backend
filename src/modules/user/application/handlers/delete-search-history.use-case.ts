import { Injectable, Inject } from '@nestjs/common';
import { IUserSearchSiteRepository } from '../../infrastructure/persistence/repositories/user-search-site.repository';

export interface DeleteSearchHistoryCommand {
  userId: string;
  ids?: string[];
  deleteAll?: boolean;
}

@Injectable()
export class DeleteSearchHistoryUseCase {
  constructor(
    @Inject('IUserSearchSiteRepository')
    private readonly searchHistoryRepository: IUserSearchSiteRepository,
  ) {}

  async execute(command: DeleteSearchHistoryCommand): Promise<void> {
    if (command.deleteAll === true) {
      await this.searchHistoryRepository.deleteAll(command.userId);
    } else if (command.ids && command.ids.length > 0) {
      await this.searchHistoryRepository.deleteByIds(command.userId, command.ids);
    }
  }
}
