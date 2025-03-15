declare module 'react-window' {
    import * as React from 'react';

    export interface ListChildComponentProps {
        index: number;
        style: React.CSSProperties;
    }

    export interface FixedSizeListProps {
        children: (props: ListChildComponentProps) => React.ReactNode;
        className?: string;
        height: number | string;
        itemCount: number;
        itemSize: number;
        width: number | string;
        itemData?: any;
        layout?: 'horizontal' | 'vertical';
        overscanCount?: number;
        useIsScrolling?: boolean;
    }

    export class FixedSizeList extends React.Component<FixedSizeListProps> {
        scrollTo(scrollOffset: number): void;
        scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
    }

    export interface VariableSizeListProps extends Omit<FixedSizeListProps, 'itemSize'> {
        itemSize: (index: number) => number;
    }

    export class VariableSizeList extends React.Component<VariableSizeListProps> {
        scrollTo(scrollOffset: number): void;
        scrollToItem(index: number, align?: 'auto' | 'smart' | 'center' | 'end' | 'start'): void;
        resetAfterIndex(index: number, shouldForceUpdate?: boolean): void;
    }

    export interface GridChildComponentProps {
        columnIndex: number;
        rowIndex: number;
        style: React.CSSProperties;
    }

    export interface FixedSizeGridProps {
        children: (props: GridChildComponentProps) => React.ReactNode;
        className?: string;
        columnCount: number;
        columnWidth: number;
        height: number;
        rowCount: number;
        rowHeight: number;
        width: number;
        itemData?: any;
        overscanColumnCount?: number;
        overscanRowCount?: number;
        useIsScrolling?: boolean;
    }

    export class FixedSizeGrid extends React.Component<FixedSizeGridProps> {
        scrollTo({ scrollLeft, scrollTop }: { scrollLeft: number; scrollTop: number }): void;
        scrollToItem({ columnIndex, rowIndex }: { columnIndex: number; rowIndex: number }): void;
    }
}
