import React, { useState, useCallback, useEffect } from "react";
import { DataGrid, Column, SortConfig } from "./lib/index";
import "./styles/App.css";

const App: React.FC = () => {
  // Generate sample data
  const generateData = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      age: Math.floor(Math.random() * 50) + 18,
      salary: Math.floor(Math.random() * 100000) + 30000,
      active: Math.random() > 0.3,
      lastLogin: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ),
      department: ["Engineering", "Sales", "Marketing", "HR", "Support"][
        Math.floor(Math.random() * 5)
      ],
    }));
  };

  const [data, setData] = useState(() => generateData(1000));
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({
    key: "id",
    direction: "asc",
  });
  const [darkMode, setDarkMode] = useState(() => {
    // Detect system preference
    return (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  // Listen for changes in system color scheme preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setDarkMode(e.matches);
    };

    // Add listener for Safari
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
    }

    return () => {
      // Remove listener for Safari
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleChange);
      }
    };
  }, []);

  // Apply dark mode class to document body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  // Custom cell renderers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (value: Date) => {
    return value.toLocaleDateString();
  };

  // Define columns with custom renderers
  const columns: Column[] = [
    {
      key: "id",
      title: "ID",
      width: 80,
      sortable: true,
    },
    {
      key: "name",
      title: "Name",
      width: 150,
      sortable: true,
    },
    {
      key: "email",
      title: "Email",
      width: 250,
      sortable: true,
    },
    {
      key: "age",
      title: "Age",
      width: 100,
      sortable: true,
      cellRenderer: (value: any) => (
        <div style={{ textAlign: "right" }}>{value}</div>
      ),
    },
    {
      key: "salary",
      title: "Salary",
      width: 150,
      sortable: true,
      cellRenderer: (value: any) => (
        <div
          style={{
            textAlign: "right",
            fontWeight: value > 80000 ? "bold" : "normal",
            color: value > 80000 ? "#4caf50" : "inherit",
          }}
        >
          {formatCurrency(value)}
        </div>
      ),
    },
    {
      key: "active",
      title: "Active",
      width: 100,
      sortable: true,
      cellRenderer: (value: any) => (
        <span
          style={{
            color: value ? "#4caf50" : "#f44336",
            fontWeight: "bold",
          }}
        >
          {value ? "Yes" : "No"}
        </span>
      ),
    },
    {
      key: "lastLogin",
      title: "Last Login",
      width: 150,
      sortable: true,
      cellRenderer: (value: any) => formatDate(value),
    },
    {
      key: "department",
      title: "Department",
      width: 150,
      sortable: true,
      cellRenderer: (value: any) => {
        const colorMap: Record<string, string> = {
          Engineering: "#bbdefb",
          Sales: "#c8e6c9",
          Marketing: "#ffccbc",
          HR: "#e1bee7",
          Support: "#f0f4c3",
        };

        return (
          <span
            style={{
              backgroundColor: colorMap[value] || "#f5f5f5",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.85em",
            }}
          >
            {value}
          </span>
        );
      },
    },
  ];

  // Handle row clicks
  const handleRowClick = useCallback((rowData: any) => {
    console.log("Row clicked:", rowData);
  }, []);

  // Handle row double clicks
  const handleRowDoubleClick = useCallback((rowData: any) => {
    console.log("Row double-clicked:", rowData);
    window.alert(`Selected user: ${rowData.name}`);
  }, []);

  // Handle cell key down events
  const handleCellKeyDown = useCallback(
    (event: React.KeyboardEvent, cellInfo: any) => {
      console.log("Key pressed on cell:", event.key, cellInfo);
    },
    []
  );

  // Simulate loading
  const handleSimulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  // Refresh data
  const handleRefreshData = () => {
    setLoading(true);
    setTimeout(() => {
      setData(generateData(1000));
      setLoading(false);
    }, 800);
  };

  // Toggle dark mode
  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className={`app-container ${darkMode ? "dark-mode" : ""}`}>
      <header className="app-header">
        <h1>React Data Matrix Demo</h1>
        <p>
          A high-performance, customizable React data grid with WebGL rendering
          support
        </p>
      </header>

      <div className="demo-controls">
        <button className="control-button" onClick={handleSimulateLoading}>
          Simulate Loading
        </button>
        <button className="control-button" onClick={handleRefreshData}>
          Refresh Data
        </button>
        <button className="control-button" onClick={toggleDarkMode}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      <section className="grid-section">
        <h2>Standard Mode</h2>
        <p>Responsive and accessible data grid with keyboard navigation</p>
        <DataGrid
          data={data}
          columns={columns}
          rowHeight={48}
          height={500}
          selectable={true}
          resizableColumns={true}
          onRowClick={handleRowClick}
          onRowDoubleClick={handleRowDoubleClick}
          pagination={true}
          pageSize={pageSize}
          onSort={(config) => {
            console.log("Sorting:", config);
            setSortConfig(config);
          }}
          animateRows={true}
          loading={loading}
          defaultSortConfig={sortConfig}
          keyboardNavigation={true}
          onCellKeyDown={handleCellKeyDown}
          ariaLabelledBy="grid-title"
          ariaDescribedBy="grid-description"
        />
        <div id="grid-title" className="sr-only">
          User Data Grid
        </div>
        <div id="grid-description" className="sr-only">
          Table of user data with sortable columns
        </div>
      </section>

      <section className="grid-section">
        <h2>WebGL Mode</h2>
        <p>
          Performance optimized rendering using WebGL, ideal for displaying
          thousands of rows
        </p>
        <DataGrid
          data={data.slice(0, 100)}
          columns={columns}
          rowHeight={48}
          height={500}
          useWebGL={true}
          loading={loading}
        />
      </section>

      <section className="feature-grid">
        <div className="feature">
          <h3>Keyboard Navigation</h3>
          <p>
            Full keyboard support with arrow keys, home/end, and page up/down
          </p>
        </div>
        <div className="feature">
          <h3>Responsive</h3>
          <p>Adapts to different screen sizes and devices</p>
        </div>
        <div className="feature">
          <h3>Accessible</h3>
          <p>ARIA support and screen reader compatibility</p>
        </div>
        <div className="feature">
          <h3>High Performance</h3>
          <p>Virtual scrolling and WebGL rendering for large datasets</p>
        </div>
        <div className="feature">
          <h3>Customizable</h3>
          <p>Custom cell renderers, sorting, and styling</p>
        </div>
        <div className="feature">
          <h3>Dark Mode</h3>
          <p>Built-in support for light and dark themes</p>
        </div>
      </section>

      <footer className="app-footer">
        <p>React Data Matrix - Open Source Data Grid Library</p>
        <p className="version">v1.0.0</p>
      </footer>
    </div>
  );
};

export default App;
