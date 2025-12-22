import { Injectable, Inject } from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { PocaEventStatus } from '../../../domain/entities/poca-event.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface AdminListPocaEventsCommand {
  status?: PocaEventStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class AdminListPocaEventsUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
  ) {}

  async execute(
    command: AdminListPocaEventsCommand,
  ): Promise<CursorPaginationResult<PocaEvent>> {
    return this.pocaEventRepository.findAllAdmin(
      {
        status: command.status,
        search: command.search,
      },
      command.cursor,
      command.limit,
    );
  }
}
