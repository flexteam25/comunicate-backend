import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetHistory } from '../../../domain/entities/bet-history.entity';
import {
  AdminBetHistoryItemDto,
  AdminBetHistoryUserDto,
} from '../../../interface/rest/admin/dto/admin-bet-history-response.dto';

export interface GetAdminBetHistoryDetailCommand {
  id: string;
}

@Injectable()
export class GetAdminBetHistoryDetailUseCase {
  constructor(
    @InjectRepository(BetHistory)
    private readonly betHistoryRepo: Repository<BetHistory>,
  ) {}

  async execute(
    command: GetAdminBetHistoryDetailCommand,
  ): Promise<AdminBetHistoryItemDto | null> {
    const { id } = command;

    const row = await this.betHistoryRepo.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!row) {
      return null;
    }

    const user: AdminBetHistoryUserDto = row.user
      ? {
          id: row.user.id,
          email: row.user.email,
          displayName: row.user.displayName ?? null,
          avatarUrl: row.user.avatarUrl ?? null,
        }
      : { id: '', email: '', displayName: null };

    return {
      id: row.id,
      user,
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
