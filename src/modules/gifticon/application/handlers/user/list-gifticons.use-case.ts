import { Injectable, Inject } from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface ListGifticonsCommand {
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListGifticonsUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
  ) {}

  async execute(
    command: ListGifticonsCommand,
  ): Promise<CursorPaginationResult<Gifticon>> {
    return this.gifticonRepository.findVisibleWithCursor(
      command.cursor,
      command.limit,
    );
  }
}
