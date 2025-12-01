import BarChart from "../../dist/graphTypes/barChart.js";
import GraphManager from "../../dist/index.js";

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const graphManager = await GraphManager.create();
const graph = new BarChart(
	canvas,
	[
		{ title: "⭐", value: 100 },
		{ title: "⭐⭐", value: 30 },
		{ title: "⭐⭐⭐", value: 3 },
		{ title: "⭐⭐⭐⭐", value: 0 },
		{ title: "⭐⭐⭐⭐⭐", value: 18 },
		{ title: "⭐", value: 10 },
		{ title: "⭐⭐", value: 30 },
		{ title: "⭐⭐⭐", value: 3 },
		{ title: "⭐⭐⭐⭐", value: 0 },
		{ title: "⭐⭐⭐⭐⭐", value: 18 },
	],
	{
		backgroundColor: { r: 0, g: 0, b: 50 },
		gap: 10,
		titleFontSize: 25,
		valueAxis: { width: 60, minPixelDistance: 25 },
		positioning: 10,
		minWidth: 5,
		minHeight: 5,
	},
);
graphManager.addGraph(graph);

window.onresize = () => {
	graph.resize(window.innerWidth, window.innerHeight);
	graph.update(graphManager.getTimestamp());
	graph.render();
};
