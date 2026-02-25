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
  prevCursor?: string | null;
}
