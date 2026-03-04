import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetHistory } from '../../domain/entities/bet-history.entity';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../shared/utils/offset-pagination.util';
import { BetHistoryItemDto } from '../../../minigame/interface/rest/dto/bet-history-response.dto';

export interface GetSelfBetHistoryCommand {
  userId: string;
  gameType?: string;
  startDate?: Date;
  endDate?: Date;
  cursor?: string;
  limit?: number;
}

export interface GetSelfBetHistoryResult {
  items: BetHistoryItemDto[];
  nextCursor: string | null;
  prevCursor: string | null;
}

const SORT_BY = 'createdAt';
const SORT_ORDER = 'DESC' as const;

function toItemDto(row: BetHistory): BetHistoryItemDto {
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

@Injectable()
export class GetSelfBetHistoryUseCase {
  constructor(
    @InjectRepository(BetHistory)
    private readonly betHistoryRepo: Repository<BetHistory>,
  ) {}

  async execute(command: GetSelfBetHistoryCommand): Promise<GetSelfBetHistoryResult> {
    const { userId, gameType, startDate, endDate, cursor, limit = 20 } = command;
    const realLimit = Math.min(Math.max(1, limit), 50);
    const filterKey = JSON.stringify({
      userId,
      gameType: gameType ?? null,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const qb = this.betHistoryRepo
      .createQueryBuilder('bh')
      .where('bh.userId = :userId', { userId })
      .select([
        'bh.id',
        'bh.gameType',
        'bh.roundNumber',
        'bh.betAmount',
        'bh.payoutAmount',
        'bh.maxPayoutDeduct',
        'bh.roundResult',
        'bh.createdAt',
      ]);

    if (gameType && gameType.trim() !== '') {
      qb.andWhere('bh.gameType ILIKE :gameType', {
        gameType: `%${gameType.trim()}%`,
      });
    }
    if (startDate) {
      qb.andWhere('bh.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('bh.createdAt <= :endDate', { endDate });
    }

    qb
      .orderBy(`bh.${SORT_BY}`, SORT_ORDER)
      .addOrderBy('bh.id', SORT_ORDER)
      .skip(offset)
      .take(realLimit + 1);

    const entities = await qb.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    const nextCursor = hasMore
      ? encodeOffsetCursor(offset + realLimit, { filterKey })
      : null;
    const prevCursor =
      offset > 0
        ? encodeOffsetCursor(Math.max(0, offset - realLimit), { filterKey })
        : null;

    return {
      items: data.map(toItemDto),
      nextCursor,
      prevCursor: prevCursor ?? null,
    };
  }
}
