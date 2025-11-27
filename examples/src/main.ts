import GraphManager from "../../dist/index.js";

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;

canvas.width = window.innerWidth / 2;
canvas.height = window.innerHeight / 2;

const graphManger = await GraphManager.create();
const graph = graphManger.newGraph(
	canvas,
	[
		{ title: "1", value: 0.5 },
		{ title: "2", value: 1 },
		{ title: "3", value: 0.7 },
		{ title: "4", value: 0 },
		{ title: "5", value: 0.33 },
		{ title: "6", value: 0.9 },
	],
	{
		backgroundColor: { r: 0, g: 0, b: 50 },
		gap: 10,
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
	graph.resize(window.innerWidth / 2, window.innerHeight / 2);
	graph.renderGraph(globalTimestamp);
};
