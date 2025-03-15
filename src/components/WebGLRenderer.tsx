import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import styles from "../styles/DataGrid.module.css";
import { Column } from "./DataGrid";

export interface WebGLRendererProps {
  data: any[];
  columns: Column[];
  rowHeight: number;
  width?: number | string;
  height?: number | string;
  onRowClick?: (rowData: any, rowIndex: number) => void;
  onRowDoubleClick?: (rowData: any, rowIndex: number) => void;
}

const WebGLRenderer: React.FC<WebGLRendererProps> = ({
  data,
  columns,
  rowHeight,
  width = "100%",
  height = 400,
  onRowClick,
  onRowDoubleClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshesRef = useRef<{ [key: string]: THREE.Mesh }>({});
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const scrollbarThumbRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [scrollOffset, setScrollOffset] = useState(0);
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);
  const totalHeight = useRef(data.length * rowHeight);
  const visibleRowsCount = useRef(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const animationFrameRef = useRef<number | null>(null);

  // Check for dark mode
  useEffect(() => {
    const isDark = document.body.classList.contains("dark-mode");
    setIsDarkMode(isDark);

    // Listen for changes to the dark-mode class
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class") {
          const isDark = document.body.classList.contains("dark-mode");
          setIsDarkMode(isDark);
        }
      });
    });

    observer.observe(document.body, { attributes: true });

    return () => observer.disconnect();
  }, []);

  // Initialize the WebGL scene
  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    // Get container dimensions
    const containerWidth =
      typeof width === "number" ? width : mountRef.current.clientWidth;
    const containerHeight =
      typeof height === "number"
        ? height
        : mountRef.current.clientHeight || 400;

    setContainerDimensions({
      width: containerWidth,
      height: containerHeight,
    });

    // Calculate visible rows
    visibleRowsCount.current = Math.ceil(containerHeight / rowHeight) + 2; // Add buffer rows

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? 0x1e1e1e : 0xffffff);
    sceneRef.current = scene;

    // Create camera
    const camera = new THREE.OrthographicCamera(
      0,
      containerWidth,
      containerHeight,
      0,
      1,
      1000
    );
    camera.position.z = 500;
    cameraRef.current = camera;

    // Create renderer with anti-aliasing and better shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(containerWidth, containerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false; // Disable shadows for better performance
    rendererRef.current = renderer;

    // Append renderer to the container
    mountRef.current.appendChild(renderer.domElement);

    // Add ambient light for better visual appeal
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    return () => {
      // Clean up resources
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      renderer.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }

      Object.values(meshesRef.current).forEach((mesh) => {
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((material) => material.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      });
    };
  }, [width, height, rowHeight, isDarkMode]);

  // Create or update cell meshes
  const renderCells = useCallback(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return;

    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = cameraRef.current;

    // Clear existing meshes
    Object.values(meshesRef.current).forEach((mesh) => {
      scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });

    meshesRef.current = {};

    // Calculate cell dimensions (default width if not provided)
    const cellWidths = columns.map((col) => col.width || 100);
    const totalWidth = cellWidths.reduce((sum, w) => sum + w, 0);

    // Calculate visible rows based on scroll position
    const startRowIndex = Math.floor(scrollOffset / rowHeight);
    const endRowIndex = Math.min(
      startRowIndex + visibleRowsCount.current,
      data.length
    );

    // Create grid of cells - only render visible rows
    for (let rowIndex = startRowIndex; rowIndex < endRowIndex; rowIndex++) {
      if (rowIndex >= data.length) break;

      const rowData = data[rowIndex];
      let offsetX = 0;

      columns.forEach((col, colIndex) => {
        const cellValue = rowData[col.key];
        const cellWidth = cellWidths[colIndex];

        // Create a higher-resolution canvas for the cell texture
        const canvas = document.createElement("canvas");
        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = cellWidth * pixelRatio;
        canvas.height = rowHeight * pixelRatio;
        const context = canvas.getContext("2d");

        if (context) {
          context.scale(pixelRatio, pixelRatio);

          // Draw background with subtle gradient
          const isHovered = rowIndex === hoveredRow;
          const isHeader = rowIndex === 0;

          // Set background color based on row state and dark mode
          let bgColor;
          if (isDarkMode) {
            if (isHeader) {
              bgColor = "#2a2a2a";
            } else if (isHovered) {
              bgColor = "#333333";
            } else {
              bgColor = "#1e1e1e";
            }
          } else {
            if (isHeader) {
              bgColor = "#f5f5f5";
            } else if (isHovered) {
              bgColor = "#f9f9f9";
            } else {
              bgColor = "#ffffff";
            }
          }

          context.fillStyle = bgColor;
          context.fillRect(0, 0, cellWidth, rowHeight);

          // Draw border
          context.strokeStyle = isDarkMode ? "#444444" : "#e0e0e0";
          context.lineWidth = 1;
          context.strokeRect(0.5, 0.5, cellWidth - 1, rowHeight - 1);

          // Draw text with better styling
          context.fillStyle = isDarkMode ? "#e0e0e0" : "#333333";
          context.font =
            "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif";
          context.textAlign = "left";
          context.textBaseline = "middle";

          // Format the cell value based on data type
          let displayValue = String(cellValue);
          if (cellValue === null || cellValue === undefined) {
            displayValue = "—";
            context.fillStyle = isDarkMode ? "#777777" : "#999999";
          } else if (typeof cellValue === "boolean") {
            displayValue = cellValue ? "✓" : "✗";
            context.fillStyle = cellValue ? "#4caf50" : "#f44336";
            context.font =
              "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          } else if (cellValue instanceof Date) {
            displayValue = cellValue.toLocaleDateString();
          } else if (typeof cellValue === "number") {
            if (col.key === "salary") {
              displayValue = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
              }).format(cellValue);

              // Highlight high salaries
              if (cellValue > 80000) {
                context.fillStyle = "#4caf50";
                context.font =
                  "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
              }
            }
          }

          // Truncate text if it's too long
          if (displayValue.length > 20) {
            displayValue = displayValue.substring(0, 17) + "...";
          }

          // Add padding to text
          context.fillText(displayValue, 8, rowHeight / 2);

          // Draw header styling
          if (isHeader) {
            context.font =
              "bold 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          }

          // Draw department chips similar to standard table
          if (col.key === "department" && cellValue) {
            const chipWidth = context.measureText(displayValue).width + 16;
            const chipHeight = 20;
            const chipX = 8;
            const chipY = (rowHeight - chipHeight) / 2;

            // Chip background colors
            let chipBg, chipText;
            switch (cellValue) {
              case "Engineering":
                chipBg = isDarkMode ? "#1565c0" : "#bbdefb";
                chipText = isDarkMode ? "#ffffff" : "#0d47a1";
                break;
              case "Sales":
                chipBg = isDarkMode ? "#2e7d32" : "#c8e6c9";
                chipText = isDarkMode ? "#ffffff" : "#1b5e20";
                break;
              case "Marketing":
                chipBg = isDarkMode ? "#d84315" : "#ffccbc";
                chipText = isDarkMode ? "#ffffff" : "#bf360c";
                break;
              case "HR":
                chipBg = isDarkMode ? "#6a1b9a" : "#e1bee7";
                chipText = isDarkMode ? "#ffffff" : "#4a148c";
                break;
              case "Support":
                chipBg = isDarkMode ? "#9e9d24" : "#f0f4c3";
                chipText = isDarkMode ? "#ffffff" : "#827717";
                break;
              default:
                chipBg = isDarkMode ? "#424242" : "#f5f5f5";
                chipText = isDarkMode ? "#ffffff" : "#333333";
            }

            // Draw chip background
            context.fillStyle = chipBg;
            context.beginPath();
            context.roundRect(chipX, chipY, chipWidth, chipHeight, 10);
            context.fill();

            // Draw chip text
            context.fillStyle = chipText;
            context.font =
              "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            context.fillText(displayValue, chipX + 8, rowHeight / 2);
          }

          // Draw active/inactive status similar to standard table
          if (col.key === "active") {
            const statusWidth = 40;
            const statusHeight = 20;
            const statusX = 8;
            const statusY = (rowHeight - statusHeight) / 2;

            // Status background
            const statusBg = cellValue ? "#4caf50" : "#f44336";

            // Draw status background
            context.fillStyle = statusBg;
            context.beginPath();
            context.roundRect(statusX, statusY, statusWidth, statusHeight, 10);
            context.fill();

            // Draw status text
            context.fillStyle = "#ffffff";
            context.font =
              "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
            context.fillText(
              cellValue ? "Yes" : "No",
              statusX + 8,
              rowHeight / 2
            );
          }
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Create material with the texture
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: false,
          side: THREE.FrontSide,
        });

        // Create geometry for the cell
        const geometry = new THREE.PlaneGeometry(cellWidth, rowHeight);

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);

        // Position the mesh
        mesh.position.x = offsetX + cellWidth / 2;
        mesh.position.y =
          (rowIndex - startRowIndex) * rowHeight + rowHeight / 2;

        // Store row data in the mesh's userData for interaction
        mesh.userData = { rowData, rowIndex, columnKey: col.key };

        // Store reference to the mesh
        const meshId = `cell-${rowIndex}-${colIndex}`;
        meshesRef.current[meshId] = mesh;

        // Add mesh to scene
        scene.add(mesh);

        // Increment X offset for next cell
        offsetX += cellWidth;
      });
    }

    // Render the scene
    renderer.render(scene, camera);
  }, [data, columns, rowHeight, scrollOffset, hoveredRow, isDarkMode]);

  // Animation loop for smooth rendering
  const animate = useCallback(() => {
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(animate);
  }, []);

  // Handle window resize
  const handleResize = useCallback(() => {
    if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

    const containerWidth =
      typeof width === "number" ? width : mountRef.current.clientWidth;
    const containerHeight =
      typeof height === "number"
        ? height
        : mountRef.current.clientHeight || 400;

    // Update renderer size
    rendererRef.current.setSize(containerWidth, containerHeight);

    // Update camera
    const camera = cameraRef.current;
    camera.left = 0;
    camera.right = containerWidth;
    camera.top = containerHeight;
    camera.bottom = 0;
    camera.updateProjectionMatrix();

    // Update container dimensions state
    setContainerDimensions({ width: containerWidth, height: containerHeight });

    // Update visible rows count
    visibleRowsCount.current = Math.ceil(containerHeight / rowHeight) + 2;

    // Re-render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [width, height, rowHeight]);

  // Handle mouse move for hover effects
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (
      !mountRef.current ||
      !sceneRef.current ||
      !cameraRef.current ||
      !rendererRef.current
    )
      return;

    // Calculate mouse position in normalized device coordinates (-1 to +1)
    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Update the picking ray with the camera and mouse position
    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

    // Calculate objects intersecting the picking ray
    const intersects = raycasterRef.current.intersectObjects(
      sceneRef.current.children
    );

    if (intersects.length > 0) {
      const intersectedMesh = intersects[0].object as THREE.Mesh;
      if (
        intersectedMesh.userData &&
        intersectedMesh.userData.rowIndex !== undefined
      ) {
        setHoveredRow(intersectedMesh.userData.rowIndex);
      }
    } else {
      setHoveredRow(null);
    }
  }, []);

  // Handle mouse click for row selection
  const handleMouseClick = useCallback(
    (event: React.MouseEvent) => {
      if (!mountRef.current || !sceneRef.current || !cameraRef.current) return;
      if (!onRowClick) return;

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Calculate objects intersecting the picking ray
      const intersects = raycasterRef.current.intersectObjects(
        sceneRef.current.children
      );

      if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object as THREE.Mesh;
        if (intersectedMesh.userData && intersectedMesh.userData.rowData) {
          onRowClick(
            intersectedMesh.userData.rowData,
            intersectedMesh.userData.rowIndex
          );
        }
      }
    },
    [onRowClick]
  );

  // Handle mouse double click
  const handleMouseDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!mountRef.current || !sceneRef.current || !cameraRef.current) return;
      if (!onRowDoubleClick) return;

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);

      // Calculate objects intersecting the picking ray
      const intersects = raycasterRef.current.intersectObjects(
        sceneRef.current.children
      );

      if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object as THREE.Mesh;
        if (intersectedMesh.userData && intersectedMesh.userData.rowData) {
          onRowDoubleClick(
            intersectedMesh.userData.rowData,
            intersectedMesh.userData.rowIndex
          );
        }
      }
    },
    [onRowDoubleClick]
  );

  // Handle wheel event for smooth scrolling
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      event.preventDefault();

      // Calculate new scroll offset with smoother scrolling
      const delta = event.deltaY * 0.5; // Reduce scroll speed for smoother scrolling
      const newOffset = Math.max(
        0,
        Math.min(
          scrollOffset + delta,
          totalHeight.current - containerDimensions.height
        )
      );

      setScrollOffset(newOffset);
    },
    [scrollOffset, containerDimensions.height]
  );

  // Handle scrollbar thumb drag
  const handleScrollThumbMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    isDraggingRef.current = true;
    document.addEventListener("mousemove", handleScrollThumbMouseMove);
    document.addEventListener("mouseup", handleScrollThumbMouseUp);
  }, []);

  const handleScrollThumbMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!isDraggingRef.current || !scrollbarThumbRef.current) return;

      const scrollbarRect =
        scrollbarThumbRef.current.parentElement?.getBoundingClientRect();
      if (!scrollbarRect) return;

      const scrollRatio =
        (event.clientY - scrollbarRect.top) / scrollbarRect.height;
      const newOffset = Math.max(
        0,
        Math.min(
          scrollRatio * totalHeight.current,
          totalHeight.current - containerDimensions.height
        )
      );

      setScrollOffset(newOffset);
    },
    [containerDimensions.height]
  );

  const handleScrollThumbMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.removeEventListener("mousemove", handleScrollThumbMouseMove);
    document.removeEventListener("mouseup", handleScrollThumbMouseUp);
  }, [handleScrollThumbMouseMove]);

  // Initialize scene on component mount
  useEffect(() => {
    const cleanup = initScene();
    window.addEventListener("resize", handleResize);

    // Start animation loop
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Clean up scrollbar event listeners
      document.removeEventListener("mousemove", handleScrollThumbMouseMove);
      document.removeEventListener("mouseup", handleScrollThumbMouseUp);
    };
  }, [
    initScene,
    handleResize,
    animate,
    handleScrollThumbMouseMove,
    handleScrollThumbMouseUp,
  ]);

  // Update cells when data, columns, or scroll position changes
  useEffect(() => {
    if (sceneRef.current && rendererRef.current && cameraRef.current) {
      renderCells();
    }
  }, [renderCells, containerDimensions, scrollOffset, hoveredRow, isDarkMode]);

  // Update scene background when dark mode changes
  useEffect(() => {
    if (sceneRef.current) {
      sceneRef.current.background = new THREE.Color(
        isDarkMode ? 0x1e1e1e : 0xffffff
      );
    }
  }, [isDarkMode]);

  // Update total height when data changes
  useEffect(() => {
    totalHeight.current = data.length * rowHeight;
  }, [data, rowHeight]);

  return (
    <div className={styles.webGLWrapper}>
      <div
        className={styles.webGLContainer}
        ref={mountRef}
        style={{
          width: width,
          height: height,
          position: "relative",
          cursor: "pointer",
        }}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
        onDoubleClick={handleMouseDoubleClick}
        onWheel={handleWheel}
      />
      {/* Scrollbar */}
      <div className={styles.webGLScrollbar}>
        <div
          ref={scrollbarThumbRef}
          className={styles.webGLScrollThumb}
          style={{
            height: `${Math.max(
              10,
              (containerDimensions.height / totalHeight.current) * 100
            )}%`,
            top: `${(scrollOffset / totalHeight.current) * 100}%`,
          }}
          onMouseDown={handleScrollThumbMouseDown}
        />
      </div>
    </div>
  );
};

export default WebGLRenderer;
