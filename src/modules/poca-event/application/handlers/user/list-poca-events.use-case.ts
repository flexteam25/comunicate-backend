import { Injectable, Inject } from '@nestjs/common';
import { PocaEvent } from '../../../domain/entities/poca-event.entity';
import { IPocaEventRepository } from '../../../infrastructure/persistence/repositories/poca-event.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListPocaEventsCommand {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListPocaEventsUseCase {
  constructor(
    @Inject('IPocaEventRepository')
    private readonly pocaEventRepository: IPocaEventRepository,
  ) {}

  async execute(
    command: ListPocaEventsCommand,
  ): Promise<CursorPaginationResult<PocaEvent>> {
    return this.pocaEventRepository.findVisibleWithCursor(
      command.cursor,
      command.limit,
    );
  }
}
