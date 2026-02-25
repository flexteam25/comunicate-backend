import { CursorPaginationUtil } from './cursor-pagination.util';

export interface DecodedCursorWithFilterKeyResult {
  decodedId?: string;
  decodedSortValue?: string;
  direction: 'forward' | 'backward';
}

export function decodeCursorWithFilterKey(params: {
  cursor?: string;
  filterKey: string;
}): DecodedCursorWithFilterKeyResult {
  const { cursor, filterKey } = params;

  let decodedId: string | undefined;
  let decodedSortValue: string | undefined;
  let direction: 'forward' | 'backward' = 'forward';

  if (!cursor) {
    return { decodedId, decodedSortValue, direction };
  }

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
      direction = 'forward';
    } else {
      decodedId = id;
      decodedSortValue = sortValue;
      if (decodedDirection === 'backward' || decodedDirection === 'forward') {
        direction = decodedDirection;
      }
    }
  } catch {
    // Invalid cursor, ignore and treat as first page
  }

  return { decodedId, decodedSortValue, direction };
}

export interface BuildPageCursorsParams<TEntity> {
  data: TEntity[];
  hasMore: boolean;
  decodedId?: string;
  direction: 'forward' | 'backward';
  cursor?: string;
  getId: (item: TEntity) => string;
  getSortValue: (item: TEntity) => string | number | Date | undefined | null;
  sortDefinition: string;
  filterKey: string;
}

export interface BuildPageCursorsResult {
  nextCursor: string | null;
  prevCursor: string | null;
}

export function buildPageCursors<TEntity>(
  params: BuildPageCursorsParams<TEntity>,
): BuildPageCursorsResult {
  const {
    data,
    hasMore,
    decodedId,
    direction,
    cursor,
    getId,
    getSortValue,
    sortDefinition,
    filterKey,
  } = params;

  if (data.length === 0) {
    return {
      nextCursor: null,
      prevCursor: null,
    };
  }

  let nextCursor: string | null = null;
  let prevCursor: string | null = null;

  const metaForward = {
    direction: 'forward' as const,
    sort: sortDefinition,
    filterKey,
  };

  const metaBackward = {
    direction: 'backward' as const,
    sort: sortDefinition,
    filterKey,
  };

  if (!decodedId || direction === 'forward') {
    if (hasMore && data.length > 0) {
      const lastItem = data[data.length - 1];
      const id = getId(lastItem);
      const sortValue = getSortValue(lastItem) ?? undefined;
      nextCursor = CursorPaginationUtil.encodeCursor(id, sortValue, metaForward);
    }

    if (decodedId && cursor && data.length > 0) {
      const firstItem = data[0];
      const id = getId(firstItem);
      const sortValue = getSortValue(firstItem) ?? undefined;
      prevCursor = CursorPaginationUtil.encodeCursor(id, sortValue, metaBackward);
    }
  } else {
    if (data.length > 0) {
      const oldestInPage = data[data.length - 1];
      const id = getId(oldestInPage);
      const sortValue = getSortValue(oldestInPage) ?? undefined;
      nextCursor = CursorPaginationUtil.encodeCursor(id, sortValue, metaForward);
    }

    if (hasMore && data.length > 0) {
      const newestInPage = data[0];
      const id = getId(newestInPage);
      const sortValue = getSortValue(newestInPage) ?? undefined;
      prevCursor = CursorPaginationUtil.encodeCursor(id, sortValue, metaBackward);
    }
  }

  return {
    nextCursor,
    prevCursor,
  };
}
