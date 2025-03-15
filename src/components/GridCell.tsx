import React from "react";
import styles from "../styles/DataGrid.module.css";
import { Column } from "./DataGrid";

export interface GridCellProps {
  value: any;
  rowIndex: number;
  column: Column;
  isSelected?: boolean;
  isFocused?: boolean;
  onClick?: (event: React.MouseEvent) => void;
}

const GridCell: React.FC<GridCellProps> = ({
  value,
  rowIndex,
  column,
  isSelected = false,
  isFocused = false,
  onClick,
}) => {
  const handleClick = (event: React.MouseEvent) => {
    if (onClick) {
      event.stopPropagation(); // Prevent row click handler from firing
      onClick(event);
    }
  };

  const renderContent = () => {
    if (column.cellRenderer) {
      return column.cellRenderer(value, rowIndex);
    }

    // Handle different data types for better display
    if (value === null || value === undefined) {
      return <span className={styles.emptyCell}>-</span>;
    }

    // Handle specific column types
    if (column.key === "active") {
      return (
        <span
          className={`${styles.statusBadge} ${
            value ? styles.statusActive : styles.statusInactive
          }`}
        >
          {value ? "Yes" : "No"}
        </span>
      );
    }

    if (column.key === "department") {
      return (
        <span
          className={`${styles.chip} ${
            styles[`chip${value.replace(/\s+/g, "")}`] || styles.chipDefault
          }`}
        >
          {value}
        </span>
      );
    }

    if (typeof value === "boolean") {
      return value ? "✓" : "✗";
    }

    // Format dates if the value is a Date object
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }

    // Format numbers with commas
    if (typeof value === "number" && !isNaN(value)) {
      // Format currency for salary
      if (column.key === "salary") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(value);
      }
      return value.toLocaleString();
    }

    return value;
  };

  // Calculate width styling based on column configuration
  const columnWidth = column.width ? `${column.width}px` : "auto";
  const flexBasis = column.width ? `${column.width}px` : "0";

  return (
    <div
      className={`
        ${styles.gridCell}
        ${isSelected ? styles.selected : ""}
        ${isFocused ? styles.focused : ""}
      `}
      style={{
        width: columnWidth,
        flexBasis: flexBasis,
        flexGrow: column.width ? 0 : 1,
      }}
      onClick={handleClick}
      data-column={column.key}
      data-row={rowIndex}
      title={typeof value === "object" ? JSON.stringify(value) : String(value)}
      role="gridcell"
      tabIndex={isFocused ? 0 : -1}
      aria-selected={isSelected}
    >
      {renderContent()}
    </div>
  );
};

export default GridCell;
