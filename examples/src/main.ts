import GraphManager from "../../dist/index.js";

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;

canvas.width = window.innerWidth - 20;
canvas.height = window.innerHeight - 20;

const graphManger = await GraphManager.create();
const graph = graphManger.newGraph(
	canvas,
	[
		{ title: "⭐", value: 10 },
		{ title: "⭐⭐", value: 15 },
		{ title: "⭐⭐⭐", value: 3 },
		{ title: "⭐⭐⭐⭐", value: 0 },
		{ title: "⭐⭐⭐⭐⭐", value: 5 },
	],
	{
		backgroundColor: { r: 0, g: 0, b: 50 },
		gap: 10,
		titleFontSize: 25,
		valueAxis: { width: 50 },
		positioning: 10,
		minWidth: 5,
		minHeight: 5,
	},
);

let globalTimestamp = 0;

function animate(timestamp: number) {
	graph.renderGraph(timestamp);
	globalTimestamp = timestamp;

	requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

window.onresize = () => {
	graph.resize(window.innerWidth - 30, window.innerHeight - 20);
	graph.renderGraph(globalTimestamp);
};
