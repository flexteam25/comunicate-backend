import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BetHistory } from '../../domain/entities/bet-history.entity';
import { CursorPaginationUtil } from '../../../../shared/utils/cursor-pagination.util';
import { BetHistoryItemDto } from '../../../minigame/interface/rest/dto/bet-history-response.dto';

export interface GetSelfBetHistoryCommand {
  userId: string;
  cursor?: string;
  limit?: number;
}

export interface GetSelfBetHistoryResult {
  items: BetHistoryItemDto[];
  nextCursor: string | null;
  previousCursor: string | null;
}

const SORT_BY = 'createdAt';
const SORT_ORDER = 'DESC' as const;

function toItemDto(row: BetHistory): BetHistoryItemDto {
  return {
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
    const { userId, cursor, limit = 20 } = command;
    const realLimit = Math.min(Math.max(1, limit), 50);
    const filterKey = userId;
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
        // Keep DESC order so we get the newest (limit+1) rows after cursor = correct previous page
        qb.orderBy(`bh.${SORT_BY}`, SORT_ORDER).addOrderBy('bh.id', SORT_ORDER);
      }
    }

    qb.take(realLimit + 1);

    const entities = await qb.getMany();
    const hasMore = entities.length > realLimit;
    const data = entities.slice(0, realLimit);

    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

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
      // prevCursor = first item of current page so "back" returns the full previous page
      if (decodedId && cursor && data.length > 0) {
        const firstItem = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(firstItem.id, getSortValue(firstItem), {
          direction: 'backward',
          sort: sortDefinition,
          filterKey,
        });
      }
    } else {
      // Backward: data is already in DESC order (newest first), no reverse needed
      if (data.length > 0) {
        const oldestInPage = data[data.length - 1];
        nextCursor = CursorPaginationUtil.encodeCursor(oldestInPage.id, getSortValue(oldestInPage), {
          direction: 'forward',
          sort: sortDefinition,
          filterKey,
        });
      }
      if (hasMore && data.length > 0) {
        const newestInPage = data[0];
        previousCursor = CursorPaginationUtil.encodeCursor(
          newestInPage.id,
          getSortValue(newestInPage),
          { direction: 'backward', sort: sortDefinition, filterKey },
        );
      }
    }

    return {
      items: data.map(toItemDto),
      nextCursor,
      previousCursor: previousCursor ?? null,
    };
  }
}
