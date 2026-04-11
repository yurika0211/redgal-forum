import type { PagerState } from "../lib/pagination";

interface PaginationBarProps {
  pager: PagerState;
  onPageChange: (page: number) => void;
  emptyText: string;
}

export default function PaginationBar({
  pager,
  onPageChange,
  emptyText,
}: PaginationBarProps) {
  const pagerButtonClassName =
    "inline-flex min-h-8 items-center justify-center rounded-full border border-[color:var(--line-soft)] bg-white/60 px-3 py-1 text-xs font-semibold text-[color:var(--text-main)] transition hover:border-[color:var(--line-strong)] hover:bg-white disabled:cursor-not-allowed disabled:opacity-45";

  if (pager.total <= 0) {
    return <p className="text-sm text-[color:var(--text-muted)]">{emptyText}</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] px-3 py-2">
      <span className="text-xs text-[color:var(--text-muted)]">
        第 {pager.page} / {Math.max(pager.totalPages, 1)} 页，共 {pager.total} 条，每页 {pager.pageSize} 条
      </span>
      <div className="flex items-center gap-2">
        <button
          className={pagerButtonClassName}
          disabled={pager.page <= 1}
          onClick={() => onPageChange(pager.page - 1)}
          type="button"
        >
          上一页
        </button>
        <button
          className={pagerButtonClassName}
          disabled={pager.totalPages === 0 || pager.page >= pager.totalPages}
          onClick={() => onPageChange(pager.page + 1)}
          type="button"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
