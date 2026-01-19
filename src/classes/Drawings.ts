import { action, makeObservable, observable } from "mobx";

export type Coordinate = {
    x: number,
    y: number
}

export type DrawingType = {
    id: number,
    position: Coordinate,
    width: number,
    height: number
}

export class Drawings {
    
    nextDrawingId = 1;
    drawings: DrawingType[] = [];
    selectedDrawings = new Set<number>();
    isDrawing = false;
    drawingStartPos: Coordinate = {x: 0, y: 0}

    constructor() {
        makeObservable(this, {
            drawings: observable,
            selectedDrawings: observable,
            isDrawing: observable,
            drawingStartPos: observable,
            startDrawing: action,
            endDrawing: action,
            addDrawing: action,
            moveDrawing: action,
            selectDrawing: action,
            clearSelection: action
        })
    }

    getWidth(start: Coordinate, end: Coordinate) {
        return Math.abs(end.x - start.x);
    }

    getHeight(start: Coordinate, end: Coordinate) {
        return Math.abs(end.y - start.y)
    }

    getMeasurements(start: Coordinate, end: Coordinate): Omit<DrawingType, 'id'> {
        const width = this.getWidth(start, end);
        const height = this.getHeight(start, end);
        const x = Math.min(start.x, end.x) + (width / 2)
        const y = Math.min(start.y, end.y) + (height / 2)

        return {position: {x, y}, width, height}
    }

    startDrawing(startPos: Coordinate) {
        this.drawingStartPos = startPos;
        this.isDrawing = true;
    }

    endDrawing(endPos: Coordinate) {
        this.isDrawing = false;
        const drawingEndPosition = endPos;
        const {position, width, height} = this.getMeasurements(this.drawingStartPos, drawingEndPosition)
        console.log("Creating drawing: ", {start: this.drawingStartPos, end: endPos, position, width, height});
        this.addDrawing(position, width, height);
    }

    addDrawing(position: Coordinate, width: number, height: number) {
        const id = this.nextDrawingId++;
        this.drawings.push({position, width, height, id});
        this.selectedDrawings.add(id)
        console.log("Drawing added, ", this.drawings.length, " drawings total.");
    }

    selectDrawing(drawing: DrawingType) {
        this.selectedDrawings.add(drawing.id);
    }

    clearSelection() {
        this.selectedDrawings.clear();
    }

    moveDrawing(drawing: DrawingType, position: Coordinate) {
        drawing.position = position;
    }
}