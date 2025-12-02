import BarChart from "../dist/graphTypes/barChart.js";
import GraphManager from "../dist/index.js";

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

const graphManager = await GraphManager.create();
const graph = new BarChart(
	canvas,
	[
		{ title: "⭐", value: 100 },
		{ title: "⭐⭐", value: 30 },
		{ title: "⭐⭐⭐", value: 3 },
		{ title: "⭐⭐⭐⭐", value: 0 },
		{ title: "⭐⭐⭐⭐⭐", value: 18 },
		{ title: "⭐", value: 80 },
		{ title: "⭐⭐", value: 0 },
		{ title: "⭐⭐⭐", value: 40 },
		{ title: "⭐⭐⭐⭐", value: 13 },
		{ title: "⭐⭐⭐⭐⭐", value: 18 },
	],
	{
		backgroundColor: { r: 0, g: 0, b: 50 },
		gap: 10,
		titleFontSize: 15,
		barCornerRadius: 20,
		valueAxis: { width: 40, minPixelDistance: 35 },
		positioning: { bottom: 30, top: 10, left: 10, right: 10 },
		minWidth: 5,
		minHeight: 7,
	},
);
graphManager.addGraph(graph);

window.onresize = () => {
	graph.resize(document.body.clientWidth, document.body.clientHeight);
	graph.update(graphManager.getTimestamp(), graph.pointer);
	graph.render();
};
