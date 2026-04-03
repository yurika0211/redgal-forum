import { describe, expect, it } from "vitest";
import { createPagerState, normalizeListResult, updatePagerFromResult } from "./pagination";

describe("pagination helpers", () => {
  it("creates a pager with zero totals", () => {
    expect(createPagerState(12)).toEqual({
      page: 1,
      pageSize: 12,
      total: 0,
      totalPages: 0,
    });
  });

  it("updates pager from paginated results", () => {
    expect(
      updatePagerFromResult({
        items: [1, 2],
        page: 2,
        page_size: 20,
        total: 41,
        total_pages: 3,
      }),
    ).toEqual({
      page: 2,
      pageSize: 20,
      total: 41,
      totalPages: 3,
    });
  });

  it("normalizes array results into pager state", () => {
    const result = normalizeListResult([1, 2, 3], createPagerState(10));
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.pager.total).toBe(3);
    expect(result.pager.totalPages).toBe(1);
  });
});
