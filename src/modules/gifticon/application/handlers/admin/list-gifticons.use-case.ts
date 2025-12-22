import { Injectable, Inject } from '@nestjs/common';
import { Gifticon } from '../../../domain/entities/gifticon.entity';
import { GifticonStatus } from '../../../domain/entities/gifticon.entity';
import { IGifticonRepository } from '../../../infrastructure/persistence/repositories/gifticon.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';

export interface AdminListGifticonsCommand {
  status?: GifticonStatus;
  search?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class AdminListGifticonsUseCase {
  constructor(
    @Inject('IGifticonRepository')
    private readonly gifticonRepository: IGifticonRepository,
  ) {}

  async execute(
    command: AdminListGifticonsCommand,
  ): Promise<CursorPaginationResult<Gifticon>> {
    return this.gifticonRepository.findAllAdmin(
      {
        status: command.status,
        search: command.search,
      },
      command.cursor,
      command.limit,
    );
  }
}
