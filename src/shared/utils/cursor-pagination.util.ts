export interface CursorPaginationOptions {
  cursor?: string;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export class CursorPaginationUtil {
  /**
   * Encode cursor from entity (using id and sort field)
   */
  static encodeCursor(id: string, sortValue?: string | number | Date): string {
    let normalizedSortValue: string | undefined;
    if (sortValue instanceof Date) {
      // Always use ISO string for dates to keep them in UTC and PostgreSQL-friendly
      normalizedSortValue = sortValue.toISOString();
    } else if (sortValue !== undefined && sortValue !== null) {
      normalizedSortValue = String(sortValue);
    }

    const cursorData = {
      id,
      sortValue: normalizedSortValue,
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Decode cursor to get id and sort value
   */
  static decodeCursor(cursor: string): { id: string; sortValue?: string } {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded) as { id: string; sortValue?: string };
      return parsed;
    } catch {
      throw new Error('Invalid cursor');
    }
  }
}
