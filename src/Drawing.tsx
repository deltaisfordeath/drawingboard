import { observer } from "mobx-react-lite"
import { type Coordinate, type DrawingType } from "./classes/Drawings";
import './drawing.css';
import { useState } from "react";
import root from "./classes/root";

export type DrawingProps = {
    drawing: DrawingType
}

const Drawing = observer(({drawing}: DrawingProps) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragDelta, setDragDelta] = useState<Coordinate | null>(null);

    // TODO: fix position of drawings when panned/zoomed
    const isSelected = root.drawings.selectedDrawings.has(drawing.id ?? -1);
    const scaledWidth = root.boardState.scale * drawing.width;
    const scaledHeight = root.boardState.scale * drawing.height;
    const {x, y} = root.boardState.boardToScreen(drawing.position);

    const drawingX = x + (drawing.width - scaledWidth) / 2
    const drawingY = y + (drawing.height - scaledHeight) / 2

    function startDragging(e: React.MouseEvent) {
        e.stopPropagation();
        e.preventDefault();
        root.drawings.selectDrawing(drawing);
        const {x: boardX, y: boardY} = root.boardState.screenToBoard({x: e.clientX, y: e.clientY});
        setDragDelta({x: boardX - drawing.position.x, y: boardY - drawing.position.y});
        setIsDragging(true);
    }

    function endDragging(e: React.MouseEvent) {
        e.preventDefault();
        setDragDelta(null);
        setIsDragging(false);
    }

    const handleMoveDrawing = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (!isDragging || !dragDelta) return;
        if (e.screenX === 0) return;

        root.drawings.moveDrawing(
            drawing, 
            root.boardState.screenToBoard(
            {   x: e.clientX - dragDelta.x,
                y: e.clientY - dragDelta.y
             }))
    }
    return <div 
        className={`drawing ${isSelected ? 'selected' : ''}`}
        onMouseDown={startDragging}
        onMouseMove={handleMoveDrawing}
        onMouseUp={endDragging}
        onMouseLeave={endDragging}
        style={{width: scaledWidth, height: scaledHeight, top: drawingY, left: drawingX}}>
        <div className="drawing-text">
            <div>X: {drawing.position.x}, Y: {drawing.position.y}</div>
            <div>Width: {drawing.width}</div>
            <div>Height: {drawing.height}</div>
            <div>Xadj: {drawingX}; Yadj: {drawingY}</div>

        </div>
        <svg width={scaledWidth} height={scaledHeight}>
            <rect x={0} y={0} width={scaledWidth} height={scaledHeight} />
        </svg>
    </div>
})

export default Drawing;