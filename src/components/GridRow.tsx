import React, { useState, useEffect, useRef } from "react";
import GridCell from "./GridCell";
import styles from "../styles/DataGrid.module.css";
import { Column } from "./DataGrid";

export interface GridRowProps {
  rowData: any;
  rowIndex: number;
  columns: Column[];
  isSelected?: boolean;
  isFocused?: boolean;
  focusedColumnIndex?: number;
  onRowClick?: (rowData: any, rowIndex: number) => void;
  onRowDoubleClick?: (rowData: any, rowIndex: number) => void;
  onRowContextMenu?: (
    event: React.MouseEvent,
    rowData: any,
    rowIndex: number
  ) => void;
  highlightOnRender?: boolean;
  enableAnimation?: boolean;
}

const GridRow: React.FC<GridRowProps> = ({
  rowData,
  rowIndex,
  columns,
  isSelected = false,
  isFocused = false,
  focusedColumnIndex,
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  highlightOnRender = false,
  enableAnimation = true,
}) => {
  const [isHighlighted, setIsHighlighted] = useState(highlightOnRender);
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (highlightOnRender) {
      setIsHighlighted(true);
      const timeout = setTimeout(() => {
        setIsHighlighted(false);
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [highlightOnRender]);

  const handleClick = () => {
    onRowClick && onRowClick(rowData, rowIndex);
  };

  const handleDoubleClick = () => {
    onRowDoubleClick && onRowDoubleClick(rowData, rowIndex);
  };

  const handleContextMenu = (event: React.MouseEvent) => {
    if (onRowContextMenu) {
      event.preventDefault();
      onRowContextMenu(event, rowData, rowIndex);
    }
  };

  // Scroll into view when focused
  useEffect(() => {
    if (isFocused && rowRef.current) {
      // Use scrollIntoView only if the row is not fully visible
      const rect = rowRef.current.getBoundingClientRect();
      const parentRect = rowRef.current.parentElement?.getBoundingClientRect();

      if (parentRect) {
        const isFullyVisible =
          rect.top >= parentRect.top && rect.bottom <= parentRect.bottom;

        if (!isFullyVisible) {
          rowRef.current.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
          });
        }
      }
    }
  }, [isFocused]);

  return (
    <div
      ref={rowRef}
      className={`
        ${styles.gridRow}
        ${isSelected ? styles.selected : ""}
        ${isHighlighted ? styles.highlightRow : ""}
        ${enableAnimation ? styles.fadeIn : ""}
        ${isFocused ? styles.focused : ""}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{ animationDelay: `${rowIndex * 0.02}s` }}
      data-row-index={rowIndex}
      role="row"
      aria-selected={isSelected}
      tabIndex={isFocused ? 0 : -1}
    >
      {columns.map((col, colIndex) => (
        <GridCell
          key={col.key}
          value={rowData[col.key]}
          rowIndex={rowIndex}
          column={col}
          isSelected={isSelected}
          isFocused={isFocused && focusedColumnIndex === colIndex}
          onClick={(e) => {
            // Cell click handled by the row's click handler
            // We could add specific cell click handling here if needed
          }}
        />
      ))}
    </div>
  );
};

export default GridRow;
