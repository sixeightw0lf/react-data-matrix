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
  const totalHeight = useRef((data.length + 1) * rowHeight);
  const visibleRowsCount = useRef(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const animationFrameRef = useRef<number | null>(null);
  const isMouseInsideRef = useRef(false);
  const hasInitializedRef = useRef(false);

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

  // Setup and initialize the WebGL renderer
  useEffect(() => {
    if (!mountRef.current) return;

    // Get container dimensions
    const { width, height } = mountRef.current.getBoundingClientRect();
    setContainerDimensions({ width, height });
    visibleRowsCount.current = Math.ceil(height / rowHeight) + 1;

    // Setup THREE.js renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio || 1);

    // Set clear color based on dark mode
    renderer.setClearColor(0x000000, 0);

    // Remove any existing canvas
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Add the renderer to the DOM
    mountRef.current.appendChild(renderer.domElement);

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? 0x1e1e1e : 0xffffff);

    // Create camera (orthographic for 2D rendering)
    const camera = new THREE.OrthographicCamera(0, width, height, 0, 0.1, 1000);
    camera.position.z = 5;

    // Store refs
    rendererRef.current = renderer;
    sceneRef.current = scene;
    cameraRef.current = camera;

    // Set camera position
    camera.left = 0;
    camera.right = width;
    camera.top = height;
    camera.bottom = 0;
    camera.updateProjectionMatrix();

    // Set up the scene with cells
    initScene();
    hasInitializedRef.current = true;

    // Set up resize observer
    const resizeObserver = new ResizeObserver(() => {
      if (!mountRef.current) return;
      const { width, height } = mountRef.current.getBoundingClientRect();
      setContainerDimensions({ width, height });
      visibleRowsCount.current = Math.ceil(height / rowHeight) + 1;

      // Update renderer size
      if (rendererRef.current) {
        rendererRef.current.setSize(width, height);
      }

      // Update camera
      if (cameraRef.current) {
        cameraRef.current.left = 0;
        cameraRef.current.right = width;
        cameraRef.current.top = height;
        cameraRef.current.bottom = 0;
        cameraRef.current.updateProjectionMatrix();
      }

      // Re-render scene
      initScene();
    });

    if (mountRef.current) {
      resizeObserver.observe(mountRef.current);
    }

    // Cleanup
    return () => {
      if (mountRef.current) {
        resizeObserver.unobserve(mountRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      Object.values(meshesRef.current).forEach((mesh) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material.dispose();
        }
      });
    };
  }, [isDarkMode, rowHeight]);

  // Handle scrollbar thumb dragging
  const handleScrollbarThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingRef.current = true;

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingRef.current || !mountRef.current) return;

        const { height } = mountRef.current.getBoundingClientRect();
        const scrollbarHeight = height;
        const mouseY = e.clientY;
        const rect = mountRef.current.getBoundingClientRect();
        const scrollbarTop = rect.top;

        // Calculate relative mouse position within the scrollbar
        const relativeY = mouseY - scrollbarTop;
        const scrollPercentage = Math.max(
          0,
          Math.min(1, relativeY / scrollbarHeight)
        );

        // Set new scroll offset
        const newOffset = Math.max(
          0,
          Math.min(
            scrollPercentage * totalHeight.current,
            totalHeight.current - containerDimensions.height
          )
        );

        setScrollOffset(newOffset);
      };

      const handleMouseUp = () => {
        isDraggingRef.current = false;
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [containerDimensions.height]
  );

  // Handle mouse move for row hover effects
  const handleMouseMove = useCallback(
    (event: React.MouseEvent) => {
      if (!mountRef.current || !sceneRef.current || !cameraRef.current) return;

      // Calculate mouse position in normalized device coordinates (-1 to +1)
      const rect = mountRef.current.getBoundingClientRect();

      // Fix: Convert mouse coordinates to match WebGL coordinate system
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Use raycaster to find objects at mouse position
      raycasterRef.current.setFromCamera(
        new THREE.Vector2(
          (x / rect.width) * 2 - 1,
          -((y / rect.height) * 2 - 1)
        ),
        cameraRef.current
      );

      // Calculate objects intersecting the picking ray
      const intersects = raycasterRef.current.intersectObjects(
        sceneRef.current.children
      );

      if (intersects.length > 0) {
        const intersectedMesh = intersects[0].object as THREE.Mesh;
        if (intersectedMesh.userData) {
          // Only update hover state if it changed (prevents unnecessary re-renders)
          if (hoveredRow !== intersectedMesh.userData.rowIndex) {
            setHoveredRow(intersectedMesh.userData.rowIndex);
          }
        }
      } else if (hoveredRow !== null) {
        setHoveredRow(null);
      }
    },
    [hoveredRow]
  );

  // Track when mouse enters the WebGL container
  const handleMouseEnter = useCallback(() => {
    isMouseInsideRef.current = true;
  }, []);

  // Track when mouse leaves the WebGL container
  const handleMouseLeave = useCallback(() => {
    isMouseInsideRef.current = false;
    setHoveredRow(null);
  }, []);

  // Updated wheel handler that DOESN'T prevent page scrolling
  const handleWheel = useCallback(
    (event: React.WheelEvent) => {
      // Only handle scrolling when reaching the top or bottom of the table
      const delta = event.deltaY;
      const newOffset = Math.max(
        0,
        Math.min(
          scrollOffset + delta,
          totalHeight.current - containerDimensions.height
        )
      );

      // Only prevent default page scroll when we're handling the scroll
      // within the bounds of our content
      if (
        (delta > 0 &&
          scrollOffset < totalHeight.current - containerDimensions.height) ||
        (delta < 0 && scrollOffset > 0)
      ) {
        // Only if we're not at the top or bottom edge of our content
        if (newOffset !== scrollOffset) {
          event.preventDefault();
          setScrollOffset(newOffset);
        }
      }
    },
    [scrollOffset, containerDimensions.height]
  );

  // Handle mouse click for row selection
  const handleMouseClick = useCallback(
    (event: React.MouseEvent) => {
      if (!mountRef.current || !sceneRef.current || !cameraRef.current) return;
      if (!onRowClick) return;

      // Calculate mouse position for raycasting
      const rect = mountRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Update the picking ray with the camera and mouse position (fix coordinates)
      raycasterRef.current.setFromCamera(
        new THREE.Vector2(
          (x / rect.width) * 2 - 1,
          -((y / rect.height) * 2 - 1)
        ),
        cameraRef.current
      );

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

  // Handle mouse double-click for row actions
  const handleMouseDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      if (!mountRef.current || !sceneRef.current || !cameraRef.current) return;
      if (!onRowDoubleClick) return;

      // Calculate mouse position for raycasting
      const rect = mountRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // Update the picking ray with the camera and mouse position (fix coordinates)
      raycasterRef.current.setFromCamera(
        new THREE.Vector2(
          (x / rect.width) * 2 - 1,
          -((y / rect.height) * 2 - 1)
        ),
        cameraRef.current
      );

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

  // Initialize scene with grid cells
  const initScene = useCallback(() => {
    if (!mountRef.current) return;
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    // Set clear color based on dark mode
    scene.background = new THREE.Color(isDarkMode ? 0x1e1e1e : 0xffffff);

    // Clear previous meshes
    Object.values(meshesRef.current).forEach((mesh) => {
      scene.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    });
    meshesRef.current = {};

    // Calculate visible rows
    const startRowIndex = Math.floor(scrollOffset / rowHeight);
    const endRowIndex = Math.min(
      startRowIndex + visibleRowsCount.current,
      data.length
    );

    // Calculate total width of all columns
    const cellWidths = columns.map((col) => col.width || 100);
    const totalWidth = cellWidths.reduce((sum, width) => sum + width, 0);

    // Always include the header row (row index -1)
    const includedRows = [-1]; // Header row
    for (let i = startRowIndex; i < endRowIndex; i++) {
      includedRows.push(i);
    }

    // Render all included rows (header + visible data rows)
    includedRows.forEach((rowIndex) => {
      let offsetX = 0;

      columns.forEach((col, colIndex) => {
        // Set cell value based on whether this is a header row or data row
        const cellValue =
          rowIndex === -1 ? col.title : data[rowIndex]?.[col.key];
        const cellWidth = cellWidths[colIndex];
        const isHeader = rowIndex === -1;

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
          context.font = `${
            isHeader ? "bold" : "normal"
          } 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif`;
          context.textAlign = "left";
          context.textBaseline = "middle";

          // Format and draw cell content
          let displayValue = "";

          if (cellValue !== undefined && cellValue !== null) {
            if (typeof cellValue === "object") {
              try {
                displayValue = JSON.stringify(cellValue);
              } catch (e) {
                displayValue = "[Object]";
              }
            } else {
              displayValue = String(cellValue);
            }
          }

          // Text with ellipsis
          const maxTextWidth = cellWidth - 16; // Account for padding
          let textX = 8; // 8px padding
          context.fillText(
            truncateText(displayValue, context, maxTextWidth),
            textX,
            rowHeight / 2
          );
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Create a plane geometry for the cell
        const geometry = new THREE.PlaneGeometry(cellWidth, rowHeight);

        // Create material with the canvas texture
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
        });

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);

        // Position the mesh - adjust for header row to be at the top
        mesh.position.x = offsetX + cellWidth / 2;

        // Position Y accounting for header row
        if (isHeader) {
          // Header row is positioned at the top and stays fixed
          mesh.position.y = rowHeight / 2;
        } else {
          // Data rows positioned below the header with scroll offset
          mesh.position.y =
            (rowIndex - startRowIndex + 1) * rowHeight + rowHeight / 2;
        }

        // Store row data in the mesh's userData for interaction
        mesh.userData = {
          rowData: isHeader ? null : data[rowIndex],
          rowIndex,
          columnKey: col.key,
          isHeader,
        };

        // Store reference to the mesh
        const meshId = `cell-${rowIndex}-${colIndex}`;
        meshesRef.current[meshId] = mesh;

        // Add mesh to scene
        scene.add(mesh);

        // Increment X offset for next cell
        offsetX += cellWidth;
      });
    });

    // Update total height to include the header row
    totalHeight.current = (data.length + 1) * rowHeight;

    // Render the scene
    renderer.render(scene, camera);
  }, [
    data,
    columns,
    rowHeight,
    scrollOffset,
    hoveredRow,
    isDarkMode,
    width,
    height,
  ]);

  // Helper function to truncate text with ellipsis
  const truncateText = (
    text: string,
    context: CanvasRenderingContext2D,
    maxWidth: number
  ): string => {
    if (!text) return "";

    if (context.measureText(text).width <= maxWidth) {
      return text;
    }

    let truncated = text;
    let width = context.measureText(truncated).width;

    while (width > maxWidth && truncated.length > 1) {
      truncated = truncated.slice(0, -1);
      width = context.measureText(truncated + "...").width;
    }

    return truncated + "...";
  };

  // Render loop - update when scrollOffset or hoveredRow changes
  useEffect(() => {
    // Only rerender the scene if we have initialized
    if (hasInitializedRef.current) {
      initScene();
    }

    // Set up render loop
    const animate = () => {
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [initScene, scrollOffset, hoveredRow]);

  // Update total height when data changes - removed to avoid infinite rerendering loop
  useEffect(() => {
    // Update total height calculation only when data or rowHeight changes
    totalHeight.current = (data.length + 1) * rowHeight; // +1 for header row
  }, [data.length, rowHeight]); // Only depend on data.length, not the entire data object

  return (
    <div className={styles.webGLWrapper} style={{ width, height }}>
      <div
        className={styles.webGLContainer}
        ref={mountRef}
        style={{
          position: "relative",
          cursor: "pointer",
        }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
          onMouseDown={handleScrollbarThumbMouseDown}
        />
      </div>
    </div>
  );
};

export default WebGLRenderer;
