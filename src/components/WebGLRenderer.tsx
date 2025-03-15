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
}

const WebGLRenderer: React.FC<WebGLRendererProps> = ({
  data,
  columns,
  rowHeight,
  width = "100%",
  height = 400,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const meshesRef = useRef<{ [key: string]: THREE.Mesh }>({});
  const [containerDimensions, setContainerDimensions] = useState({
    width: 0,
    height: 0,
  });

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

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
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
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Append renderer to the container
    mountRef.current.appendChild(renderer.domElement);

    // Add ambient light for better visual appeal
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light for subtle shadows
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(0, 1, 2);
    scene.add(directionalLight);

    return () => {
      // Clean up resources
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
  }, [width, height]);

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

    // Create container for cool 3D effects
    const container = new THREE.Group();
    scene.add(container);

    // Create grid of cells
    data.forEach((rowData, rowIndex) => {
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
          const gradient = context.createLinearGradient(0, 0, 0, rowHeight);
          gradient.addColorStop(0, "#ffffff");
          gradient.addColorStop(1, "#f5f5f5");
          context.fillStyle = gradient;
          context.fillRect(0, 0, cellWidth, rowHeight);

          // Draw border
          context.strokeStyle = "#e0e0e0";
          context.lineWidth = 1;
          context.strokeRect(0.5, 0.5, cellWidth - 1, rowHeight - 1);

          // Draw text with better styling
          context.fillStyle = "#333333";
          context.font =
            "13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, sans-serif";
          context.textAlign = "left";
          context.textBaseline = "middle";

          // Format the cell value based on data type
          let displayValue = String(cellValue);
          if (cellValue === null || cellValue === undefined) {
            displayValue = "—";
            context.fillStyle = "#999999";
          } else if (typeof cellValue === "boolean") {
            displayValue = cellValue ? "✓" : "✗";
            context.fillStyle = cellValue ? "#4caf50" : "#f44336";
            context.font =
              "bold 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
          }

          // Truncate text if it's too long
          if (displayValue.length > 20) {
            displayValue = displayValue.substring(0, 17) + "...";
          }

          // Add padding to text
          context.fillText(displayValue, 8, rowHeight / 2);

          // Draw a subtle highlight if it's a header row
          if (rowIndex === 0 && colIndex === 0) {
            context.fillStyle = "rgba(33, 150, 243, 0.1)";
            context.fillRect(0, 0, cellWidth, rowHeight);
          }
        }

        // Create texture from canvas
        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        // Create material with the texture
        const material = new THREE.MeshStandardMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
        });

        // Create geometry for the cell
        const geometry = new THREE.PlaneGeometry(cellWidth, rowHeight);

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);

        // Position the mesh
        mesh.position.x = offsetX + cellWidth / 2;
        mesh.position.y = rowIndex * rowHeight + rowHeight / 2;

        // Apply some subtle animation
        const initialY = mesh.position.y;
        mesh.position.y += 10;
        mesh.material.opacity = 0;

        // Animate the cell appearing with a slight delay based on column and row
        const delay = (rowIndex * 0.02 + colIndex * 0.01) * 1000;
        setTimeout(() => {
          const startTime = Date.now();
          const duration = 300;

          function animateCell() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function for smoother animation
            const easedProgress = 1 - Math.pow(1 - progress, 3);

            mesh.position.y = initialY + 10 * (1 - easedProgress);
            mesh.material.opacity = easedProgress;

            if (progress < 1) {
              requestAnimationFrame(animateCell);
            }
          }

          animateCell();
        }, delay);

        // Store reference to the mesh
        const meshId = `cell-${rowIndex}-${colIndex}`;
        meshesRef.current[meshId] = mesh;

        // Add mesh to scene
        scene.add(mesh);

        // Increment X offset for next cell
        offsetX += cellWidth;
      });
    });

    // Render the scene
    renderer.render(scene, camera);

    // Set up animation loop for subtle movements
    const animate = () => {
      const animationId = requestAnimationFrame(animate);

      // Add subtle hover effect based on mouse position
      // This is just a placeholder for more advanced interactions

      renderer.render(scene, camera);
      return animationId;
    };

    const animationId = animate();
    return () => cancelAnimationFrame(animationId);
  }, [data, columns, rowHeight]);

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

    // Re-render
    if (rendererRef.current && sceneRef.current && cameraRef.current) {
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }
  }, [width, height]);

  // Initialize scene on component mount
  useEffect(() => {
    const cleanup = initScene();
    window.addEventListener("resize", handleResize);

    return () => {
      if (cleanup) cleanup();
      window.removeEventListener("resize", handleResize);
    };
  }, [initScene, handleResize]);

  // Update cells when data or columns change
  useEffect(() => {
    if (sceneRef.current && rendererRef.current && cameraRef.current) {
      const cleanupCells = renderCells();
      return cleanupCells;
    }
  }, [renderCells, containerDimensions]);

  return (
    <div
      className={styles.webGLContainer}
      ref={mountRef}
      style={{
        width: width,
        height: height,
        position: "relative",
      }}
    />
  );
};

export default WebGLRenderer;
