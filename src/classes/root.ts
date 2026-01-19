import { makeAutoObservable } from "mobx";
import {BoardState} from './BoardState'
import { Drawings } from "./Drawings";

export class Root {
    boardState: BoardState;
    drawings: Drawings;

    constructor() {
        this.boardState = new BoardState();
        this.drawings = new Drawings();
        makeAutoObservable(this);
    }
}

const root = new Root();

export default root;