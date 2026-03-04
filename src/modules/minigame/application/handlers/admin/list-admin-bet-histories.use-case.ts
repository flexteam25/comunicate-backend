import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetHistory } from '../../../domain/entities/bet-history.entity';
import {
  decodeOffsetCursor,
  encodeOffsetCursor,
} from '../../../../../shared/utils/offset-pagination.util';
import {
  AdminBetHistoryItemDto,
  AdminBetHistoryUserDto,
} from '../../../interface/rest/admin/dto/admin-bet-history-response.dto';

export interface ListAdminBetHistoriesCommand {
  userId?: string;
  gameType?: string;
  startDate?: Date;
  endDate?: Date;
  userName?: string;
  cursor?: string;
  limit?: number;
}

export interface ListAdminBetHistoriesResult {
  data: AdminBetHistoryItemDto[];
  nextCursor: string | null;
  prevCursor: string | null;
}

const SORT_BY = 'createdAt';
const SORT_ORDER = 'DESC' as const;

function toItemDto(row: BetHistory & { user?: { id: string; email: string; displayName?: string | null; avatarUrl?: string | null } }): AdminBetHistoryItemDto {
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

@Injectable()
export class ListAdminBetHistoriesUseCase {
  constructor(
    @InjectRepository(BetHistory)
    private readonly betHistoryRepo: Repository<BetHistory>,
  ) {}

  async execute(command: ListAdminBetHistoriesCommand): Promise<ListAdminBetHistoriesResult> {
    const { userId, gameType, startDate, endDate, userName, cursor, limit = 20 } = command;
    const realLimit = Math.min(Math.max(1, limit), 50);
    const filterKey = JSON.stringify({
      userId: userId ?? null,
      gameType: gameType ?? null,
      startDate: startDate ? startDate.toISOString() : null,
      endDate: endDate ? endDate.toISOString() : null,
      userName: userName ? userName.toLowerCase() : null,
    });
    const { offset } = decodeOffsetCursor({ cursor, filterKey });

    const qb = this.betHistoryRepo
      .createQueryBuilder('bh')
      .leftJoinAndSelect('bh.user', 'user');

    if (userId) {
      qb.andWhere('bh.userId = :userId', { userId });
    }
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
    if (userName && userName.trim() !== '') {
      const term = `%${userName.trim().toLowerCase()}%`;
      qb.andWhere(
        '(user.deletedAt IS NULL AND (LOWER(user.email) LIKE :userName OR LOWER(user.displayName) LIKE :userName))',
        { userName: term },
      );
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
      data: data.map(toItemDto),
      nextCursor,
      prevCursor: prevCursor ?? null,
    };
  }
}
