export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  /**
   * Cursor to load the previous page.
   * Optional so existing usages that don't support backward pagination remain valid.
   */
  previousCursor?: string | null;
}

export interface CursorMeta {
  /**
   * Paging direction that this cursor represents.
   * - "forward": go to older records (next page)
   * - "backward": go to newer records (previous page)
   */
  direction?: 'forward' | 'backward';
  /**
   * Sort definition used when the cursor was created, e.g.
   * "attendanceDate:DESC,createdAt:DESC,id:DESC".
   */
  sort?: string;
  /**
   * Stable key tying this cursor to a particular query (filters, range, etc.).
   * Repositories are responsible for computing and validating this.
   */
  filterKey?: string;
}

export class CursorPaginationUtil {
  /**
   * Encode cursor from entity (using id and sort field)
   */
  static encodeCursor(
    id: string,
    sortValue?: string | number | Date,
    meta?: CursorMeta,
  ): string {
    let normalizedSortValue: string | undefined;
    if (sortValue instanceof Date) {
      // Always use ISO string for dates to keep them in UTC and PostgreSQL-friendly
      normalizedSortValue = sortValue.toISOString();
    } else if (sortValue !== undefined && sortValue !== null) {
      normalizedSortValue = String(sortValue);
    }

    const cursorData: {
      v: number;
      id: string;
      sortValue?: string;
      dir?: 'forward' | 'backward';
      sort?: string;
      filterKey?: string;
    } = {
      v: 1,
      id,
      sortValue: normalizedSortValue,
    };

    if (meta?.direction) {
      cursorData.dir = meta.direction;
    }
    if (meta?.sort) {
      cursorData.sort = meta.sort;
    }
    if (meta?.filterKey) {
      cursorData.filterKey = meta.filterKey;
    }

    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Decode cursor to get id and sort value
   */
  static decodeCursor(
    cursor: string,
  ): {
    id: string;
    sortValue?: string;
    direction?: 'forward' | 'backward';
    sort?: string;
    filterKey?: string;
  } {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded) as {
        v?: number;
        id: string;
        sortValue?: string;
        dir?: 'forward' | 'backward';
        sort?: string;
        filterKey?: string;
      };

      return {
        id: parsed.id,
        sortValue: parsed.sortValue,
        direction: parsed.dir,
        sort: parsed.sort,
        filterKey: parsed.filterKey,
      };
    } catch {
      throw new Error('Invalid cursor');
    }
  }
}
