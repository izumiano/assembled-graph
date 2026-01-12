import { BarChart, GraphManager } from "../dist/index.js";

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;
const graphInfoElem = document.getElementById("graphInfo") as HTMLElement;

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

const graphManager = await GraphManager.create();
const graph = new BarChart(
	canvas,
	[
		{ title: "⭐", value: 50 },
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
		backgroundColor: { r: 10, g: 5, b: 40 },
		barOptions: {
			cornerRadius: 20,
			minWidth: 5,
			minHeight: 7,
			hoverScale: 1.1,
		},
		titleFontSize: 15,
		valueAxis: { width: 40, minPixelDistance: 35 },
		positioning: { bottom: 30, top: 20, left: 10, right: 10 },
	},
	(info) => {
		if (!info) {
			graphInfoElem.classList.add("hidden");
			return;
		}
		graphInfoElem.classList.remove("hidden");

		const { data, positionInfo } = info;

		graphInfoElem.innerText = data.title + data.value;

		const rect = graphInfoElem.getBoundingClientRect();
		let left = positionInfo.x - rect.width;
		if (left < 0) {
			left = positionInfo.x + positionInfo.width;
		}
		graphInfoElem.style.left = `${left}px`;
		graphInfoElem.style.top = `${positionInfo.y}px`;
	},
);
if (graphManager) {
	graphManager.addGraph(graph);

	window.onresize = () => {
		graph.resize(document.body.clientWidth, document.body.clientHeight);
		graph.update(graphManager.getTimestamp());
		graph.render();
	};
}
