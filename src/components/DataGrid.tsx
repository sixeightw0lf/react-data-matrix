import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  KeyboardEvent,
} from "react";
import GridHeader, { SortConfig } from "./GridHeader";
import GridRow from "./GridRow";
import GridFooter from "./GridFooter";
import { FixedSizeList as List, ListChildComponentProps } from "react-window";
import WebGLRenderer from "./WebGLRenderer";
import styles from "../styles/DataGrid.module.css";

export interface Column {
  key: string;
  title: string;
  width?: number;
  cellRenderer?: (data: any, rowIndex: number) => React.ReactNode;
  sortable?: boolean;
  sortFunction?: (a: any, b: any, direction: "asc" | "desc") => number;
  filterable?: boolean;
}

export interface DataGridProps {
  data: any[];
  columns: Column[];
  rowHeight?: number;
  useWebGL?: boolean;
  height?: number | string;
  width?: number | string;
  onRowClick?: (rowData: any, rowIndex: number) => void;
  onRowDoubleClick?: (rowData: any, rowIndex: number) => void;
  onRowContextMenu?: (
    event: React.MouseEvent,
    rowData: any,
    rowIndex: number
  ) => void;
  selectable?: boolean;
  resizableColumns?: boolean;
  pagination?: boolean;
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  onSort?: (sortConfig: SortConfig | null) => void;
  defaultSortConfig?: SortConfig | null;
  animateRows?: boolean;
  keyboardNavigation?: boolean;
  onCellKeyDown?: (
    event: KeyboardEvent,
    cellInfo: {
      rowData: any;
      rowIndex: number;
      columnKey: string;
      value: any;
    }
  ) => void;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
}

const DataGrid: React.FC<DataGridProps> = ({
  data = [],
  columns = [],
  rowHeight = 40,
  useWebGL = false,
  height = 400,
  width = "100%",
  onRowClick,
  onRowDoubleClick,
  onRowContextMenu,
  selectable = true,
  resizableColumns = true,
  pagination = false,
  pageSize = 25,
  className = "",
  emptyMessage = "No data to display",
  loading = false,
  onSort: externalOnSort,
  defaultSortConfig = null,
  animateRows = true,
  keyboardNavigation = true,
  onCellKeyDown,
  ariaLabelledBy,
  ariaDescribedBy,
}) => {
  // Refs
  const listRef = useRef<List | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [gridDimensions, setGridDimensions] = useState({ width: 0, height: 0 });

  // State
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    defaultSortConfig
  );
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [focusedCell, setFocusedCell] = useState<{
    rowIndex: number;
    columnIndex: number;
  } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: col.width || 100 }), {})
  );
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    rowData: any;
    rowIndex: number;
  } | null>(null);

  // Recalculate grid dimensions on window resize
  useEffect(() => {
    const calculateGridDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGridDimensions({
          width: rect.width,
          height: typeof height === "string" ? rect.height : Number(height),
        });
      }
    };

    // Calculate dimensions on mount
    calculateGridDimensions();

    // Set up resize observer for responsive behavior
    const resizeObserver = new ResizeObserver(calculateGridDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Clean up observer
    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
      resizeObserver.disconnect();
    };
  }, [height]);

  // Context menu handlers
  const handleContextMenu = useCallback(
    (event: React.MouseEvent, rowData: any, rowIndex: number) => {
      if (onRowContextMenu) {
        onRowContextMenu(event, rowData, rowIndex);
      } else {
        event.preventDefault();
        setContextMenu({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          rowData,
          rowIndex,
        });
      }
    },
    [onRowContextMenu]
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu) {
        closeContextMenu();
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu, closeContextMenu]);

  // Sorting logic
  const handleSort = useCallback(
    (column: Column) => {
      if (!column.sortable) return;

      const newSortConfig: SortConfig =
        sortConfig?.key === column.key
          ? {
              key: column.key,
              direction: sortConfig.direction === "asc" ? "desc" : "asc",
            }
          : { key: column.key, direction: "asc" };

      setSortConfig(newSortConfig);
      externalOnSort && externalOnSort(newSortConfig);

      // Reset to first page when sorting
      setCurrentPage(1);

      // Scroll to top
      if (listRef.current) {
        listRef.current.scrollTo(0);
      }
    },
    [sortConfig, externalOnSort]
  );

  // Column resize logic
  const handleColumnResize = useCallback(
    (columnKey: string, newWidth: number) => {
      setColumnWidths((prev) => ({
        ...prev,
        [columnKey]: newWidth,
      }));
    },
    []
  );

  // Selection logic
  const handleRowClick = useCallback(
    (rowData: any, rowIndex: number) => {
      if (selectable) {
        setSelectedRows((prev) => {
          const newSelection = new Set(prev);
          if (newSelection.has(rowIndex)) {
            newSelection.delete(rowIndex);
          } else {
            newSelection.add(rowIndex);
          }
          return newSelection;
        });
      }

      // Set focused cell
      if (keyboardNavigation && columns.length > 0) {
        setFocusedCell({
          rowIndex,
          columnIndex: 0,
        });
      }

      if (onRowClick) {
        onRowClick(rowData, rowIndex);
      }
    },
    [selectable, onRowClick, keyboardNavigation, columns]
  );

  // Data processing
  const processData = useCallback(() => {
    let processedData = [...data];

    // Sort data if needed
    if (sortConfig && sortConfig.direction) {
      const { key, direction } = sortConfig;
      const column = columns.find((col) => col.key === key);

      processedData.sort((a, b) => {
        // Use custom sort function if provided
        if (column?.sortFunction) {
          return column.sortFunction(a, b, direction);
        }

        // Default sort logic
        const aValue = a[key];
        const bValue = b[key];

        // Handle null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return direction === "asc" ? -1 : 1;
        if (bValue == null) return direction === "asc" ? 1 : -1;

        // Sort by type
        if (typeof aValue === "string" && typeof bValue === "string") {
          return direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return direction === "asc"
          ? aValue > bValue
            ? 1
            : -1
          : aValue < bValue
          ? 1
          : -1;
      });
    }

    // Paginate if needed
    if (pagination) {
      const startIndex = (currentPage - 1) * pageSize;
      processedData = processedData.slice(startIndex, startIndex + pageSize);
    }

    return processedData;
  }, [data, sortConfig, columns, pagination, currentPage, pageSize]);

  const processedData = processData();
  const totalPages = pagination ? Math.ceil(data.length / pageSize) : 1;

  // Keyboard navigation - moved after processedData is declared
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!keyboardNavigation || !focusedCell || processedData.length === 0)
        return;

      const { rowIndex, columnIndex } = focusedCell;
      let newRowIndex = rowIndex;
      let newColumnIndex = columnIndex;

      switch (event.key) {
        case "ArrowUp":
          newRowIndex = Math.max(0, rowIndex - 1);
          event.preventDefault();
          break;
        case "ArrowDown":
          newRowIndex = Math.min(processedData.length - 1, rowIndex + 1);
          event.preventDefault();
          break;
        case "ArrowLeft":
          newColumnIndex = Math.max(0, columnIndex - 1);
          event.preventDefault();
          break;
        case "ArrowRight":
          newColumnIndex = Math.min(columns.length - 1, columnIndex + 1);
          event.preventDefault();
          break;
        case "Home":
          if (event.ctrlKey) {
            newRowIndex = 0;
            newColumnIndex = 0;
          } else {
            newColumnIndex = 0;
          }
          event.preventDefault();
          break;
        case "End":
          if (event.ctrlKey) {
            newRowIndex = processedData.length - 1;
            newColumnIndex = columns.length - 1;
          } else {
            newColumnIndex = columns.length - 1;
          }
          event.preventDefault();
          break;
        case "PageUp":
          newRowIndex = Math.max(0, rowIndex - 10);
          event.preventDefault();
          break;
        case "PageDown":
          newRowIndex = Math.min(processedData.length - 1, rowIndex + 10);
          event.preventDefault();
          break;
        case "Enter":
        case " ":
          if (selectable) {
            setSelectedRows((prev) => {
              const newSelection = new Set(prev);
              if (newSelection.has(rowIndex)) {
                newSelection.delete(rowIndex);
              } else {
                newSelection.add(rowIndex);
              }
              return newSelection;
            });
          }
          event.preventDefault();
          break;
        default:
          // Custom key handler
          if (onCellKeyDown) {
            const column = columns[columnIndex];
            onCellKeyDown(event, {
              rowData: processedData[rowIndex],
              rowIndex,
              columnKey: column.key,
              value: processedData[rowIndex][column.key],
            });
          }
      }

      // Update focused cell if changed
      if (newRowIndex !== rowIndex || newColumnIndex !== columnIndex) {
        setFocusedCell({
          rowIndex: newRowIndex,
          columnIndex: newColumnIndex,
        });

        // Scroll into view if necessary
        if (listRef.current && newRowIndex !== rowIndex) {
          listRef.current.scrollToItem(newRowIndex, "smart");
        }
      }
    },
    [
      focusedCell,
      processedData,
      columns,
      selectable,
      onCellKeyDown,
      keyboardNavigation,
    ]
  );

  // For accessibility - announcing changes when sorting or pagination changes
  useEffect(() => {
    const announce = (message: string) => {
      const liveRegion = document.createElement("div");
      liveRegion.setAttribute("aria-live", "polite");
      liveRegion.setAttribute("aria-atomic", "true");
      liveRegion.setAttribute("class", "sr-only");
      document.body.appendChild(liveRegion);

      setTimeout(() => {
        liveRegion.textContent = message;

        setTimeout(() => {
          document.body.removeChild(liveRegion);
        }, 1000);
      }, 100);
    };

    if (sortConfig) {
      const column = columns.find((col) => col.key === sortConfig.key);
      if (column) {
        announce(
          `Table sorted by ${column.title} in ${
            sortConfig.direction === "asc" ? "ascending" : "descending"
          } order`
        );
      }
    }

    if (pagination) {
      announce(`Showing page ${currentPage} of ${totalPages}`);
    }
  }, [sortConfig, currentPage, columns, pagination, totalPages]);

  // WebGL render mode
  if (useWebGL) {
    return (
      <div
        className={`${styles.dataGrid} ${className}`}
        ref={containerRef}
        style={{ position: "relative" }}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        role="grid"
      >
        {loading && (
          <div className={styles.loading} aria-live="polite">
            <div className={styles.loadingSpinner} aria-label="Loading" />
          </div>
        )}
        <WebGLRenderer
          data={processedData}
          columns={columns.map((col) => ({
            ...col,
            width: columnWidths[col.key] || col.width || 100,
          }))}
          rowHeight={rowHeight}
          width={width}
          height={height}
          onRowClick={onRowClick}
          onRowDoubleClick={onRowDoubleClick}
        />
        {pagination && (
          <GridFooter
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={data.length}
            pageSize={pageSize}
          />
        )}
      </div>
    );
  }

  // Empty state
  if (processedData.length === 0 && !loading) {
    return (
      <div
        className={`${styles.dataGrid} ${className}`}
        ref={containerRef}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        role="grid"
      >
        <GridHeader
          columns={columns.map((col) => ({
            ...col,
            width: columnWidths[col.key] || col.width,
          }))}
          sortConfig={sortConfig}
          onSort={handleSort}
          resizableColumns={resizableColumns}
          onColumnResize={handleColumnResize}
        />
        <div className={styles.emptyState} aria-live="polite">
          {emptyMessage}
        </div>
        {pagination && (
          <GridFooter
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={data.length}
            pageSize={pageSize}
          />
        )}
      </div>
    );
  }

  // Standard render mode
  return (
    <div
      className={`${styles.dataGrid} ${className}`}
      ref={containerRef}
      style={{
        position: "relative",
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
      }}
      onKeyDown={handleKeyDown}
      tabIndex={keyboardNavigation ? 0 : undefined}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      role="grid"
    >
      {loading && (
        <div className={styles.loading} aria-live="polite">
          <div className={styles.loadingSpinner} aria-label="Loading" />
        </div>
      )}

      <GridHeader
        columns={columns.map((col) => ({
          ...col,
          width: columnWidths[col.key] || col.width,
        }))}
        sortConfig={sortConfig}
        onSort={handleSort}
        resizableColumns={resizableColumns}
        onColumnResize={handleColumnResize}
      />

      <div className={styles.tableWrapper}>
        <List
          ref={listRef}
          height={
            gridDimensions.height
              ? Math.max(100, gridDimensions.height - 48)
              : 400
          } // Ensure minimum height of 100px
          itemCount={processedData.length}
          itemSize={rowHeight}
          width={gridDimensions.width || "100%"}
          className={styles.virtualList}
          overscanCount={5} // Increase overscan for smoother scrolling
        >
          {({ index, style }: ListChildComponentProps) => (
            <div style={{ ...style, width: "100%" }}>
              <GridRow
                rowData={processedData[index]}
                rowIndex={index}
                columns={columns.map((col) => ({
                  ...col,
                  width: columnWidths[col.key] || col.width,
                }))}
                isSelected={selectedRows.has(index)}
                isFocused={focusedCell?.rowIndex === index}
                focusedColumnIndex={
                  focusedCell?.rowIndex === index
                    ? focusedCell.columnIndex
                    : undefined
                }
                onRowClick={handleRowClick}
                onRowDoubleClick={onRowDoubleClick}
                onRowContextMenu={handleContextMenu}
                enableAnimation={animateRows}
              />
            </div>
          )}
        </List>
      </div>

      {pagination && (
        <GridFooter
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={data.length}
          pageSize={pageSize}
        />
      )}

      {contextMenu && contextMenu.visible && (
        <div
          className={styles.contextMenu}
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
          }}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              if (selectable) {
                setSelectedRows(new Set([contextMenu.rowIndex]));
              }
              closeContextMenu();
            }}
          >
            Select
          </div>
          <div className={styles.contextMenuItem} onClick={closeContextMenu}>
            Copy
          </div>
        </div>
      )}
    </div>
  );
};

export default DataGrid;
