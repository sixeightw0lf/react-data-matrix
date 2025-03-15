import React from "react";
import styles from "../styles/DataGrid.module.css";
import { Column } from "./DataGrid";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export interface GridHeaderProps {
  columns: Column[];
  sortConfig?: SortConfig | null;
  onSort?: (column: Column) => void;
  resizableColumns?: boolean;
  onColumnResize?: (columnKey: string, newWidth: number) => void;
}

const GridHeader: React.FC<GridHeaderProps> = ({
  columns,
  sortConfig,
  onSort,
  resizableColumns = false,
  onColumnResize,
}) => {
  // Handle column resize
  const handleResizeStart = (
    e: React.MouseEvent,
    columnKey: string,
    initialWidth: number
  ) => {
    if (!resizableColumns || !onColumnResize) return;

    e.preventDefault();
    const startX = e.clientX;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(50, initialWidth + deltaX);
      onColumnResize(columnKey, newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.classList.remove(styles.resizing);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.classList.add(styles.resizing);
  };

  return (
    <div className={styles.gridHeader}>
      {columns.map((col) => {
        const isSorted = sortConfig?.key === col.key;
        const sortDirection = isSorted ? sortConfig.direction : null;

        return (
          <div
            key={col.key}
            className={`${styles.headerCell} ${isSorted ? styles.sorted : ""}`}
            style={{ width: col.width || "auto", position: "relative" }}
            onClick={() => onSort && onSort(col)}
          >
            <span>{col.title}</span>

            {isSorted && (
              <span
                className={`${styles.sortIcon} ${
                  sortDirection === "asc" ? styles.ascending : styles.descending
                }`}
              >
                {sortDirection === "asc" ? "▲" : "▼"}
              </span>
            )}

            {resizableColumns && (
              <div
                className={styles.resizeHandle}
                onMouseDown={(e) =>
                  handleResizeStart(e, col.key, col.width || 100)
                }
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default GridHeader;
