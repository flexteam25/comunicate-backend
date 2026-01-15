import { Injectable, Inject } from '@nestjs/common';
import { IUserHistorySiteRepository } from '../../infrastructure/persistence/repositories/user-history-site.repository';

export interface DeleteSiteHistoryCommand {
  userId: string;
  ids?: string[];
  deleteAll?: boolean;
}

@Injectable()
export class DeleteSiteHistoryUseCase {
  constructor(
    @Inject('IUserHistorySiteRepository')
    private readonly historyRepository: IUserHistorySiteRepository,
  ) {}

  async execute(command: DeleteSiteHistoryCommand): Promise<void> {
    if (command.deleteAll === true) {
      await this.historyRepository.deleteAll(command.userId);
    } else if (command.ids && command.ids.length > 0) {
      await this.historyRepository.deleteByIds(command.userId, command.ids);
    }
  }
}
