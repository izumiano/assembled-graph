import GraphManager from "../../dist/index.js"

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;

canvas.width = 500;
canvas.height = 500;

const graphManger = await GraphManager.create()
const graph = graphManger.newGraph(canvas);

function animate(timestamp: number){
	graph.renderGraph(timestamp)
	requestAnimationFrame(animate)
}

requestAnimationFrame(animate)
