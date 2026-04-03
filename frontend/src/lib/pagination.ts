import type { Paginated } from "../api";

export interface PagerState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function createPagerState(pageSize: number): PagerState {
  return {
    page: 1,
    pageSize,
    total: 0,
    totalPages: 0,
  };
}

export function updatePagerFromResult<T>(result: Paginated<T>): PagerState {
  return {
    page: result.page,
    pageSize: result.page_size,
    total: result.total,
    totalPages: result.total_pages,
  };
}

export function normalizeListResult<T>(
  value: unknown,
  currentPager: PagerState,
): { items: T[]; pager: PagerState } {
  if (Array.isArray(value)) {
    return {
      items: value as T[],
      pager: {
        ...currentPager,
        total: value.length,
        totalPages: value.length > 0 ? 1 : 0,
      },
    };
  }

  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items?: unknown }).items)
  ) {
    const paginated = value as Paginated<T>;
    return {
      items: paginated.items,
      pager: updatePagerFromResult(paginated),
    };
  }

  return {
    items: [],
    pager: {
      ...currentPager,
      total: 0,
      totalPages: 0,
    },
  };
}
