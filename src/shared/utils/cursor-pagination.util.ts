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
    const cursorData = {
      id,
      sortValue: sortValue ? String(sortValue) : undefined,
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Decode cursor to get id and sort value
   */
  static decodeCursor(cursor: string): { id: string; sortValue?: string } {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new Error('Invalid cursor');
    }
  }
}
