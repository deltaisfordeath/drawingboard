import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Minus, Plus, RefreshCw } from 'lucide-react';
import { observer } from 'mobx-react-lite';
import root from './classes/root';
import { autorun, runInAction } from 'mobx';
import Drawing from './Drawing';
import { type DrawingType, type Coordinate } from './classes/Drawings';

const InfiniteGrid = observer(() => {
  const canvasRef:React.RefObject<HTMLCanvasElement | null> = useRef(null);
  const containerRef:React.RefObject<HTMLDivElement | null> = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startDrawingPos, setStartDrawingPos] = useState<Coordinate | null>(null);
  const [tempDrawing, setTempDrawing] = useState<DrawingType | null>(null);
  const [toolType, setToolType] = useState(0);

  const handleWheel = useCallback((e: WheelEvent) => {
      // Prevent native browser zooming
      e.stopPropagation();
      e.preventDefault();

      const zoomSensitivity = 0.005;
      const delta = -e.deltaY * zoomSensitivity;

      // Zoom towards mouse pointer logic
      // TODO: Fix this logic to keep mouse centered on zoom
      // 1. Get mouse position relative to canvas
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // 2. Calculate world coordinates of the mouse before zoom
      const worldX = (mouseX - root.boardState.boardPos.x) / root.boardState.scale;
      const worldY = (mouseY - root.boardState.boardPos.y) / root.boardState.scale;

      // 3. Calculate new offset to keep the world point under the mouse
      const newX = mouseX - worldX;
      const newY = mouseY - worldY;

      root.boardState.zoom(delta, newX, newY, rect);

  }, [canvasRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas?.addEventListener('wheel', handleWheel);
    return () => canvas?.removeEventListener('wheel', handleWheel);
  }, [canvasRef, handleWheel])

// 1. Reactive Drawing: Automatically redraw when Store changes
  useEffect(() => {
    // autorun will call 'draw' immediately, and then again whenever
    // any observable accessed inside 'draw' changes.
    
    const disposer = autorun(() => {
        root.boardState.draw(canvasRef.current);
    });

    if (!containerRef.current) return;

    root.boardState.setPosition(
      containerRef.current?.offsetWidth / 2, 
      containerRef.current?.offsetHeight / 2,
    );

    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const { offsetWidth , offsetHeight } = canvasRef.current;
        // Update canvas resolution for high DPI displays
        if (canvasRef.current) {
          const dpr = window.devicePixelRatio || 1;
          canvasRef.current.width = offsetWidth * dpr;
          canvasRef.current.height = offsetHeight * dpr;
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) ctx.scale(dpr, dpr);
        }
      }
    };

    const observer = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) {
          runInAction(() =>{
            root.boardState.setSize(entry.contentRect.width, entry.contentRect.height);
            handleResize();
          })

        }
    });
    observer.observe(containerRef.current);
    
    return () => {
      observer.disconnect();
      disposer();
    };
  }, []);

  // --- Interaction Handlers ---

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    // Only drag on left click (button 0)
    if (e.button === 0) {
      e.stopPropagation();
      
      if (toolType === 0) root.boardState.startDrag(e.clientX, e.clientY);
      if (toolType === 1) {
        root.drawings.clearSelection();
        setIsDragging(true);
        const boardPos = root.boardState.screenToBoard({x: e.clientX, y: e.clientY})
        setStartDrawingPos(boardPos);
        root.drawings.startDrawing(boardPos);
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.preventDefault();
    if (toolType === 0) root.boardState.handleDrag(e.clientX, e.clientY);
    if (toolType === 1) {
      if (!startDrawingPos || !isDragging) return;
      setTempDrawing({...root.drawings.getMeasurements(startDrawingPos, root.boardState.screenToBoard({x: e.clientX, y: e.clientY})), id: -1});
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();

    if (toolType === 0) root.boardState.endDrag(e.clientX, e.clientY);
    if (toolType === 1) {
      if (!isDragging) return;
      setIsDragging(false);
      setTempDrawing(null);
      setStartDrawingPos(null);
      root.drawings.endDrawing(root.boardState.screenToBoard({x: e.clientX, y: e.clientY}));
    }
  };

  const resetView = root.boardState.resetView;

  return (
    <div className="kennyboard-container">
      
      {/* The Canvas Layer */}
      <div 
        ref={containerRef} 
        id="drawingboard-canvas-container"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: root.boardState.cursor }}
      >
        <canvas id="drawingboard-canvas" ref={canvasRef} />
        {root.drawings.drawings.map((d, idx) => <Drawing drawing={d} key={`drawing-${idx}`} />)}
        {tempDrawing && <Drawing drawing={tempDrawing} />}
      </div>

      {/* Floating UI Overlay (Demonstrating Content Layer) */}
      <div className="kennyboard-overlay">
        <div>
          <span>ZOOM</span>
          <span>{(root.boardState.scale * 100).toFixed(0)}%</span>
          
          <span>OFFSET X</span>
          <span>{root.boardState.boardPos.x.toFixed(0)} px</span>
          
          <span>OFFSET Y</span>
          <span>{root.boardState.boardPos.y.toFixed(0)} px</span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="kennyboard-toolbar">
        <button 
          onClick={() => root.boardState.zoomOut(canvasRef.current?.getBoundingClientRect())}
          className="toolbar-button"
          title="Zoom Out"
        >
          <Minus />
        </button>

        <div />

        <button 
          onClick={resetView}
          className="toolbar-button"
          title="Reset View"
        >
          <RefreshCw />
        </button>

        <div />

        <button 
          onClick={() => root.boardState.zoomIn(canvasRef.current?.getBoundingClientRect())}
          className="toolbar-button"
          title="Zoom In"
        >
          <Plus />
        </button>
        <button
          onClick={() => setToolType(0)}
          className='toolbar-button'
          title="Pan"
        >
          Pan
        </button>
        <button
          onClick={() => setToolType(1)}
          className='toolbar-button'
          title="Select"
        >
          Select
        </button>
      </div>
    </div>
  );
});

export default InfiniteGrid;