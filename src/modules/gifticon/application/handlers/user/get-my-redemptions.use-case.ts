import { Injectable, Inject } from '@nestjs/common';
import { IGifticonRedemptionRepository } from '../../../infrastructure/persistence/repositories/gifticon-redemption.repository';
import { CursorPaginationResult } from '../../../../../shared/utils/cursor-pagination.util';
import { GifticonRedemption } from '../../../domain/entities/gifticon-redemption.entity';

export interface GetMyRedemptionsCommand {
  userId: string;
  cursor?: string;
  limit?: number;
}

@Injectable()
export class GetMyRedemptionsUseCase {
  constructor(
    @Inject('IGifticonRedemptionRepository')
    private readonly redemptionRepository: IGifticonRedemptionRepository,
  ) {}

  async execute(
    command: GetMyRedemptionsCommand,
  ): Promise<CursorPaginationResult<GifticonRedemption>> {
    return this.redemptionRepository.findByUserIdWithCursor(
      command.userId,
      command.cursor,
      command.limit || 20,
    );
  }
}
