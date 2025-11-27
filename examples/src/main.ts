import GraphManager from "../../dist/index.js";

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;

canvas.width = window.innerWidth / 2;
canvas.height = window.innerHeight / 2;

const graphManger = await GraphManager.create();
const graph = graphManger.newGraph(canvas);

function animate(timestamp: number) {
	graph.renderGraph(timestamp);

	requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.onresize = () => {
	graph.resize(window.innerWidth / 2, window.innerHeight / 2);
};
