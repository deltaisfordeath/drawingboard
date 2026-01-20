import { action, makeObservable, observable} from "mobx";
import type { Coordinate } from "./Drawings";

export class BoardState {
  // Observables
  boardPos: Coordinate = {x: 0, y: 0};
  scale = 1;
  size = { width: 0, height: 0 };
  isDragging = false;
  cursor = 'default';
  
  // Internal tracking for drag deltas
  lastMouse = { x: 0, y: 0 };

  // Config
  readonly MIN_SCALE = 0.1;
  readonly MAX_SCALE = 5;
  readonly GRID_SIZE = 200; // Base distance between lines
  readonly MAJOR_GRID_STEP = 5; // Every 5th line is a major line

  constructor() {
    makeObservable(this, {
      boardPos: observable,
      scale: observable,
      size: observable,
      isDragging: observable,
      cursor: observable,
      setPosition: action,
      setScale: action,
      setSize: action,
      startDrag: action,
      handleDrag: action,
      endDrag: action,
      zoom: action,
      zoomIn: action,
      zoomOut: action,
      resetView: action
    });
  }

  // --- Actions ---

  setPosition(x: number, y:number) {
    this.boardPos = {x, y};
  }

  setScale(newScale: number) {
    if (newScale > this.MAX_SCALE) return this.scale = this.MAX_SCALE;
    if (newScale < this.MIN_SCALE) return this.scale = this.MIN_SCALE;
    this.scale = newScale;
  }

  setSize(width: number, height: number) {
    this.size = { width, height };
  }

  startDrag(x: number, y: number) {
    this.isDragging = true;
    this.cursor = 'grabbing';
    this.lastMouse = { x, y };
  }

  handleDrag(x: number, y: number) {
    if (!this.isDragging) return;

    const dx = x - this.lastMouse.x;
    const dy = y - this.lastMouse.y;

    this.boardPos.x += dx;
    this.boardPos.y += dy;

    this.lastMouse = {x, y};
  }

  endDrag(x: number, y: number) {
    this.isDragging = false;
    this.cursor = 'default';
    this.lastMouse = { x, y };
  }

  zoom(deltaY: number, mouseX: number, mouseY: number, rect: DOMRect) {
    const zoomSensitivity = 0.001;
    const delta = -deltaY * zoomSensitivity;
    let newScale = this.scale + delta * 10;

    // Clamp
    newScale = Math.min(Math.max(newScale, this.MIN_SCALE), this.MAX_SCALE);

    // Calculate Mouse Position relative to Canvas
    const canvasMouseX = mouseX - rect.left;
    const canvasMouseY = mouseY - rect.top;

    // Calculate World Coordinates before zoom
    const worldX = (canvasMouseX - this.boardPos.x) / this.scale;
    const worldY = (canvasMouseY - this.boardPos.y) / this.scale;

    // Calculate new offset to keep world point under mouse
    const newX = canvasMouseX - worldX * newScale;
    const newY = canvasMouseY - worldY * newScale;

    this.boardPos = {
      x: newX,
      y: newY
    };
    this.scale = newScale;
  }

  zoomIn(rect?: DOMRect) {
    if (!rect) return;
    this.zoom(-5, this.boardPos.x, this.boardPos.y, rect)
  }

  zoomOut(rect?: DOMRect) {
    if (!rect) return;
    this.zoom(5, this.boardPos.x, this.boardPos.y, rect);
  }

  screenToBoard(screenPos: Coordinate): Coordinate {
    return({x: screenPos.x - this.boardPos.x, y: screenPos.y - this.boardPos.y});
  }

  boardToScreen(boardPos: Coordinate): Coordinate {
    return({x: boardPos.x + this.boardPos.x, y: boardPos.y + this.boardPos.y});
  }

  resetView = () => {
    // Center based on current size

    this.boardPos = { 
      x: this.size.width / 2, 
      y: this.size.height / 2, 
    };
  }
    // Main Drawing Logic
  draw = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = this.size;
    const { x: offsetX, y: offsetY } = this.boardPos;
    const scale = this.scale / 10;

    // Clear Screen
    ctx.clearRect(0, 0, width, height);

    // Background Color
    ctx.fillStyle = '#18181b'; // zinc-900
    ctx.fillRect(0, 0, width, height);

    const scaledGridSize = 20 + (this.GRID_SIZE * scale) % 20;
    const scaleMultiple = Math.floor(this.GRID_SIZE * scale) / 20;

    // Calculate visible grid range
    // We start drawing from slightly before the left/top edge to ensure continuity
    const startX = Math.floor(-offsetX / scaledGridSize) * scaledGridSize + offsetX;
    const startY = Math.floor(-offsetY / scaledGridSize) * scaledGridSize + offsetY;

    ctx.lineWidth = 1;

    // Function to draw lines
    // const drawGridLines = (start: number, end: number, step: number, isVertical: boolean) => {
    //   for (let i = start; i < end; i += step) {
    //     // Calculate the actual grid index to determine if it's a major line
    //     // We reverse the math: (screenCoordinate - offset) / scaledGridSize
    //     const realVal = isVertical 
    //       ? (i - offsetX) / scaledGridSize 
    //       : (i - offsetY) / scaledGridSize;
        
    //     // Check if close to an integer for major line check (accounting for float precision)
    //     const roundedIndex = Math.round(realVal);
    //     const isMajor = Math.abs(realVal - roundedIndex) < 0.1 && roundedIndex % this.MAJOR_GRID_STEP === 0;

    //     ctx.beginPath();
    //     if (isMajor) {
    //       ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'; // Brighter for major lines
    //     } else {
    //       ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // Faint for minor lines
    //     }
        
    //     if (isVertical) {
    //       ctx.moveTo(i, 0);
    //       ctx.lineTo(i, height);
    //     } else {
    //       ctx.moveTo(0, i);
    //       ctx.lineTo(width, i);
    //     }
    //     ctx.stroke();
    //   }
    // };

    const drawGridLines = (start: number, end: number, step: number, isVertical: boolean) => {
      // Set text properties once outside the loop
      ctx.font = '10px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Faint white for labels
      
      for (let i = start; i < end; i += step) {
        const realVal = isVertical 
          ? (i - offsetX) / scaledGridSize 
          : (i - offsetY) / scaledGridSize;

          console.log(scaledGridSize, scaleMultiple);
        
        const roundedIndex = Math.round(realVal);
        const isMajor = Math.abs(realVal - roundedIndex) < 0.1 && roundedIndex % this.MAJOR_GRID_STEP === 0;

        ctx.beginPath();
        if (isMajor) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
          
          // --- DRAW TEXT LABELS ---
          // We multiply by the grid size to show "world coordinates"
          const zoomMultiple = Math.floor(scaleMultiple * 10) / 10;
          const labelValue = (roundedIndex * this.GRID_SIZE / 10) / zoomMultiple;
          
          // Skip labeling 0 if you want to avoid cluttering the blue origin marker
          if (labelValue !== 0) {
            if (isVertical) {
              // X-axis labels: Draw near the top of the screen or along the X-axis
              // use (i + 4) for a small padding from the line
              ctx.fillText(labelValue.toString(), i + 4, 12); 
            } else {
              // Y-axis labels: Draw near the left edge
              ctx.fillText(labelValue.toString(), 4, i - 4);
            }
          }
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        }
        
        if (isVertical) {
          ctx.moveTo(i, 0);
          ctx.lineTo(i, height);
        } else {
          ctx.moveTo(0, i);
          ctx.lineTo(width, i);
        }
        ctx.stroke();
      }
    };

    // Draw Vertical Lines
    drawGridLines(startX, width, scaledGridSize, true);
    
    // Draw Horizontal Lines
    drawGridLines(startY, height, scaledGridSize, false);

    // Draw Center Origin Marker (0,0)
    const originX = offsetX;
    const originY = offsetY;
    
    // Only draw if within view
    if (originX >= -20 && originX <= width + 20 && originY >= -20 && originY <= height + 20) {
      ctx.fillStyle = '#3b82f6'; // blue-500
      ctx.beginPath();
      ctx.arc(originX, originY, 5 * scale, 0, Math.PI * 2);
      ctx.fill();
      
      // Axis lines at origin
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(originX, originY - 20 * scale);
      ctx.lineTo(originX, originY + 20 * scale);
      ctx.moveTo(originX - 20 * scale, originY);
      ctx.lineTo(originX + 20 * scale, originY);
      ctx.stroke();
    }

  };
}