# React Data Matrix

A high-performance, customizable React data grid with advanced features and WebGL rendering support. Perfect for displaying large datasets with excellent UX.

![React Data Matrix Demo](https://github.com/yourusername/react-data-matrix/raw/main/docs/demo.gif)

## Features

- **Virtualization:** Efficiently renders large datasets using virtualized rendering
- **WebGL Rendering:** Optional WebGL mode for ultra-high-performance data visualization
- **Sorting & Pagination:** Built-in sorting and pagination capabilities
- **Keyboard Navigation:** Full keyboard support with arrow keys, Home/End, and Page Up/Down
- **Accessibility:** ARIA support and screen reader compatibility
- **Responsive Design:** Adapts to various screen sizes and devices
- **Theme Support:** Light and dark mode with CSS variables for easy customization
- **Animations:** Smooth transitions and animations for a polished user experience
- **Custom Cell Renderers:** Flexible cell rendering for custom formatting and components
- **Resizable Columns:** User-adjustable column widths
- **Row Selection:** Built-in support for selecting and highlighting rows
- **Context Menu:** Right-click context menu support
- **TypeScript Support:** Full TypeScript definitions for better development experience

## Installation

```bash
npm install react-data-matrix
# or
yarn add react-data-matrix
```

## Basic Usage

```jsx
import React from 'react';
import { DataGrid } from 'react-data-matrix';

const MyTable = () => {
  // Define your columns
  const columns = [
    { key: 'id', title: 'ID', width: 80, sortable: true },
    { key: 'name', title: 'Name', width: 150, sortable: true },
    { key: 'email', title: 'Email', width: 250, sortable: true }
  ];

  // Your data array
  const data = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Doe', email: 'jane@example.com' },
    // ... more data
  ];

  return (
    <DataGrid
      data={data}
      columns={columns}
      rowHeight={48}
      height={500}
      selectable={true}
      pagination={true}
      pageSize={25}
    />
  );
};

export default MyTable;
```

## Advanced Features

### Custom Cell Renderers

```jsx
// Example of custom cell renderers
const columns = [
  {
    key: 'status',
    title: 'Status',
    width: 100,
    sortable: true,
    cellRenderer: (value, rowIndex) => (
      <span style={{
        color: value === 'Active' ? 'green' : 'red',
        fontWeight: 'bold'
      }}>
        {value}
      </span>
    )
  },
  // ... other columns
];
```

### WebGL Rendering

For extremely large datasets, use the WebGL renderer:

```jsx
<DataGrid
  data={largeDataset}
  columns={columns}
  useWebGL={true}
  height={600}
/>
```

### Keyboard Navigation

The grid supports full keyboard navigation:

- **Arrow keys**: Navigate between cells
- **Home/End**: Navigate to the beginning/end of a row
- **Ctrl+Home/End**: Navigate to the first/last cell of the grid
- **Page Up/Down**: Navigate up/down by 10 rows
- **Enter/Space**: Select the current row (when selectable is enabled)

You can also handle custom keyboard events:

```jsx
<DataGrid
  /* ... other props ... */
  keyboardNavigation={true}
  onCellKeyDown={(event, cellInfo) => {
    if (event.key === 'Delete') {
      // Handle delete key press
      console.log('Delete pressed on:', cellInfo);
    }
  }}
/>
```

### Dark Mode Support

The grid automatically supports dark mode:

```jsx
<DataGrid
  /* ... other props ... */
  className={isDarkMode ? 'dark-theme' : ''}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | Array | `[]` | Array of data objects to display |
| `columns` | Array | `[]` | Column configuration objects |
| `rowHeight` | Number | `40` | Height of each row in pixels |
| `height` | Number/String | `400` | Height of the grid (number or CSS value) |
| `width` | Number/String | `"100%"` | Width of the grid (number or CSS value) |
| `useWebGL` | Boolean | `false` | Use WebGL rendering mode |
| `selectable` | Boolean | `true` | Enable row selection |
| `resizableColumns` | Boolean | `true` | Allow columns to be resized |
| `pagination` | Boolean | `false` | Enable pagination |
| `pageSize` | Number | `25` | Number of rows per page |
| `loading` | Boolean | `false` | Show loading spinner |
| `keyboardNavigation` | Boolean | `true` | Enable keyboard navigation |
| `animateRows` | Boolean | `true` | Enable row animations |
| `defaultSortConfig` | Object | `null` | Default sorting configuration |
| `className` | String | `""` | Additional CSS class name |
| `emptyMessage` | String | `"No data to display"` | Message shown when there's no data |
| `ariaLabelledBy` | String | `undefined` | ID of element that labels the grid |
| `ariaDescribedBy` | String | `undefined` | ID of element that describes the grid |

### Event Handlers

| Prop | Type | Description |
|------|------|-------------|
| `onRowClick` | Function | Called when a row is clicked |
| `onRowDoubleClick` | Function | Called when a row is double-clicked |
| `onRowContextMenu` | Function | Called when a row is right-clicked |
| `onSort` | Function | Called when a sortable column is clicked |
| `onCellKeyDown` | Function | Called when a key is pressed while a cell is focused |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Credits

- Built with React and TypeScript
- Uses [react-window](https://github.com/bvaughn/react-window) for virtualization
- WebGL rendering powered by [Three.js](https://threejs.org/)

---

Made with ❤️ by [Your Name]
