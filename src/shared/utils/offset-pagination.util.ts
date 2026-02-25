export interface OffsetCursorMeta {
  /**
   * Stable key describing the current filter set.
   * E.g. JSON.stringify({ status, siteId, siteName }).
   */
  filterKey: string;
}

export interface DecodeOffsetCursorParams {
  cursor?: string;
  filterKey: string;
}

export interface DecodeOffsetCursorResult {
  offset: number;
}

/**
 * Encode offset + filterKey into a cursor (base64 JSON).
 */
export function encodeOffsetCursor(offset: number, meta: OffsetCursorMeta): string {
  return Buffer.from(
    JSON.stringify({
      v: 1,
      offset,
      filterKey: meta.filterKey,
    }),
  ).toString('base64');
}

/**
 * Decode cursor to offset and validate filterKey.
 * Returns offset = 0 if cursor is invalid or filterKey does not match.
 */
export function decodeOffsetCursor(
  params: DecodeOffsetCursorParams,
): DecodeOffsetCursorResult {
  const { cursor, filterKey } = params;

  if (!cursor) {
    return { offset: 0 };
  }

  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8')) as {
      v?: number;
      offset?: number;
      filterKey?: string;
    };

    if (parsed.filterKey && parsed.filterKey !== filterKey) {
      return { offset: 0 };
    }

    const offset = Number(parsed.offset);
    if (Number.isInteger(offset) && offset >= 0) {
      return { offset };
    }

    return { offset: 0 };
  } catch {
    return { offset: 0 };
  }
}
