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
  if (pager.total <= 0) {
    return <p className="panel-empty">{emptyText}</p>;
  }

  return (
    <div className="pagination-bar">
      <span className="pagination-bar__meta">
        第 {pager.page} / {Math.max(pager.totalPages, 1)} 页，共 {pager.total} 条，每页 {pager.pageSize} 条
      </span>
      <div className="pagination-bar__actions">
        <button
          className="ghost-button"
          disabled={pager.page <= 1}
          onClick={() => onPageChange(pager.page - 1)}
          type="button"
        >
          上一页
        </button>
        <button
          className="ghost-button"
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
