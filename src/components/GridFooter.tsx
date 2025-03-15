import React from "react";
import styles from "../styles/DataGrid.module.css";

export interface GridFooterProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  totalItems?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (pageSize: number) => void;
}

const GridFooter: React.FC<GridFooterProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  totalItems,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
}) => {
  // Generate pagination range with ellipsis
  const getPaginationRange = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];
    let l;

    range.push(1);

    if (totalPages <= 1) {
      return range;
    }

    for (let i = currentPage - delta; i <= currentPage + delta; i++) {
      if (i < totalPages && i > 1) {
        range.push(i);
      }
    }

    range.push(totalPages);

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Handle page size change
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    onPageSizeChange && onPageSizeChange(newSize);
  };

  return (
    <div className={styles.gridFooter}>
      {/* Pagination information */}
      <div className={styles.paginationInfo}>
        {totalItems !== undefined && pageSize && (
          <span>
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalItems)}-
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
          </span>
        )}
      </div>

      {/* Pagination controls */}
      <div className={styles.paginationControls}>
        {/* Previous page button */}
        <button
          className={`${styles.pageButton} ${
            currentPage <= 1 ? styles.disabled : ""
          }`}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
        >
          ←
        </button>

        {/* Page numbers */}
        {getPaginationRange().map((page, index) => (
          <button
            key={index}
            className={`${styles.pageButton} ${
              page === currentPage ? styles.active : ""
            }`}
            onClick={() => typeof page === "number" && handlePageChange(page)}
            disabled={typeof page !== "number"}
          >
            {page}
          </button>
        ))}

        {/* Next page button */}
        <button
          className={`${styles.pageButton} ${
            currentPage >= totalPages ? styles.disabled : ""
          }`}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
        >
          →
        </button>
      </div>

      {/* Page size selector */}
      {onPageSizeChange && (
        <div className={styles.pageSizeSelector}>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            aria-label="Items per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size} per page
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default GridFooter;
