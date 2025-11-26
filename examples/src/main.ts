import {createGraph} from "../../dist/index.js"

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;

canvas.width = 500;
canvas.height = 500;

createGraph(canvas);
