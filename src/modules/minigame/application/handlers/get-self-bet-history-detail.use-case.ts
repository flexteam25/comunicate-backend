import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetHistory } from '../../domain/entities/bet-history.entity';
import { BetHistoryItemDto } from '../../../minigame/interface/rest/dto/bet-history-response.dto';

export interface GetSelfBetHistoryDetailCommand {
  userId: string;
  id: string;
}

@Injectable()
export class GetSelfBetHistoryDetailUseCase {
  constructor(
    @InjectRepository(BetHistory)
    private readonly betHistoryRepo: Repository<BetHistory>,
  ) {}

  async execute(command: GetSelfBetHistoryDetailCommand): Promise<BetHistoryItemDto | null> {
    const { userId, id } = command;

    const row = await this.betHistoryRepo.findOne({
      where: {
        id,
        userId,
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      gameType: row.gameType,
      roundNumber: row.roundNumber ?? null,
      betAmount: row.betAmount,
      payoutAmount: row.payoutAmount,
      maxPayoutDeduct: row.maxPayoutDeduct,
      roundResult: row.roundResult ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
