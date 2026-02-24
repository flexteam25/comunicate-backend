import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetHistory } from '../../../domain/entities/bet-history.entity';
import { CursorPaginationUtil } from '../../../../../shared/utils/cursor-pagination.util';
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
    const sortDefinition = `${SORT_BY}:${SORT_ORDER},id:${SORT_ORDER}`;

    let decodedId: string | undefined;
    let decodedSortValue: string | undefined;
    let direction: 'forward' | 'backward' = 'forward';

    if (cursor) {
      try {
        const {
          id,
          sortValue,
          direction: decodedDirection,
          filterKey: cursorFilterKey,
        } = CursorPaginationUtil.decodeCursor(cursor);
        if (cursorFilterKey && cursorFilterKey !== filterKey) {
          decodedId = undefined;
          decodedSortValue = undefined;
        } else {
          decodedId = id;
          if (sortValue !== null && sortValue !== undefined) {
            decodedSortValue = sortValue;
          }
          if (decodedDirection === 'backward' || decodedDirection === 'forward') {
            direction = decodedDirection;
          }
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

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

    if (!decodedId || direction === 'forward') {
      qb.orderBy(`bh.${SORT_BY}`, SORT_ORDER).addOrderBy('bh.id', SORT_ORDER);
    }

    if (decodedId) {
      let parsedSortValue: Date | undefined;
      if (decodedSortValue != null) {
        parsedSortValue = new Date(decodedSortValue);
      }

      if (direction === 'forward') {
        qb.andWhere('bh.id != :cursorId', { cursorId: decodedId });
        if (parsedSortValue !== undefined) {
          qb.andWhere(
            `(bh.${SORT_BY} < :sortValue OR (bh.${SORT_BY} = :sortValue AND bh.id < :cursorId))`,
            { sortValue: parsedSortValue, cursorId: decodedId },
          );
        } else {
          qb.andWhere('bh.id < :cursorId', { cursorId: decodedId });
        }
      } else {
        if (parsedSortValue !== undefined) {
          qb.andWhere(
            `(bh.${SORT_BY} > :sortValue OR (bh.${SORT_BY} = :sortValue AND bh.id > :cursorId))`,
            { sortValue: parsedSortValue, cursorId: decodedId },
          );
        } else {
          qb.andWhere('bh.id > :cursorId', { cursorId: decodedId });
        }
        qb.orderBy(`bh.${SORT_BY}`, SORT_ORDER).addOrderBy('bh.id', SORT_ORDER);
      }
    }

    qb.take(realLimit + 1);

    const entities = await qb.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let prevCursor: string | null = null;

    const getSortValue = (item: BetHistory): Date => item.createdAt;

    if (!decodedId || direction === 'forward') {
      if (hasMore && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(lastItem.id, getSortValue(lastItem), {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(
          oldestInPage.id,
          getSortValue(oldestInPage),
          { direction: 'forward', sort: sortDefinition, filterKey },
        );
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        prevCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          getSortValue(newestInPage),
          { direction: 'backward', sort: sortDefinition, filterKey },
        );
      }
    }

    return {
      data: data.map(toItemDto),
      nextCursor,
      prevCursor: prevCursor ?? null,
    };
  }
}
