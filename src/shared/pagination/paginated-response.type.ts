import { PaginationOrder } from './pagination-order.enum';

export type PaginationMeta = {
  page: number;
  take: number;
  itemCount: number;
  totalItems: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  order: PaginationOrder;
  orderBy: string | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  meta: PaginationMeta;
};

export function getSkip(page: number, take: number): number {
  return (page - 1) * take;
}

export function toPaginatedResponse<T>(params: {
  data: T[];
  page: number;
  take: number;
  totalItems: number;
  order: PaginationOrder;
  orderBy?: string;
}): PaginatedResponse<T> {
  const totalPages = Math.max(1, Math.ceil(params.totalItems / params.take));

  return {
    data: params.data,
    meta: {
      page: params.page,
      take: params.take,
      itemCount: params.data.length,
      totalItems: params.totalItems,
      totalPages,
      hasPreviousPage: params.page > 1,
      hasNextPage: params.page < totalPages,
      order: params.order,
      orderBy: params.orderBy ?? null,
    },
  };
}
