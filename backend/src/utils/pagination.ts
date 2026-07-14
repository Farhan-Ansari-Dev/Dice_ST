export interface PaginationOptions {
  page?: string | number;
  limit?: string | number;
  defaultLimit?: number;
  maxLimit?: number;
}

export function getPaginationData(options: PaginationOptions) {
  const defaultLimit = options.defaultLimit || 20;
  const maxLimit = options.maxLimit || 100;
  
  const page = Math.max(1, parseInt(options.page as string || '1', 10));
  let limit = parseInt(options.limit as string || String(defaultLimit), 10);
  
  if (limit > maxLimit) limit = maxLimit;
  if (limit < 1) limit = defaultLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPaginationResponse(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1
  };
}
