import { Injectable, Inject } from '@nestjs/common';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { GifticonRedemption } from '../../../domain/entities/gifticon-redemption.entity';

export interface ListRedemptionsCommand {
  status?: string;
  userId?: string;
  gifticonId?: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class ListRedemptionsUseCase {
  constructor(
    @Inject('IGifticonRedemptionRepository')
    private readonly redemptionRepository: IGifticonRedemptionRepository,
  ) {}

  async execute(
    command: ListRedemptionsCommand,
  ): Promise<CursorPaginationResult<GifticonRedemption>> {
    return this.redemptionRepository.findAllWithCursor(
      {
        status: command.status,
        userId: command.userId,
        gifticonId: command.gifticonId,
      },
      command.cursor,
      command.limit || 20,
    );
  }
}
