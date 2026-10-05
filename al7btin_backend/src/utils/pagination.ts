export interface PaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page?: number;
    limit: number;
    total?: number;
    totalPages?: number;
    nextCursor?: string | null;
    prevCursor?: string | null;
    hasNext: boolean;
  };
}

export interface CursorPayload {
  id: string;
  createdAt: string;
}

/**
 * Encodes cursor data into an opaque URL-safe base64 token
 */
export const encodeCursor = (payload: CursorPayload): string => {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

/**
 * Decodes an opaque base64 cursor token back into cursor payload
 */
export const decodeCursor = (cursor?: string): CursorPayload | null => {
  if (!cursor || typeof cursor !== 'string') return null;
  try {
    const json = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed.id === 'string' && typeof parsed.createdAt === 'string') {
      return parsed as CursorPayload;
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Standardize pagination parameters from query string
 */
export const parsePaginationParams = (
  query: Record<string, any>,
  defaultLimit: number = 20,
  maxLimit: number = 100
): { page: number; limit: number; cursor?: string; decodedCursor: CursorPayload | null } => {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const rawLimit = parseInt(query.limit as string, 10) || defaultLimit;
  const limit = Math.min(Math.max(1, rawLimit), maxLimit);
  const cursor = typeof query.cursor === 'string' && query.cursor.trim() ? query.cursor.trim() : undefined;
  const decodedCursor = decodeCursor(cursor);

  return { page, limit, cursor, decodedCursor };
};
