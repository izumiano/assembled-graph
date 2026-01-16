import {
	__assembledGraphLogger__,
	BarChart,
	GraphManager,
} from "../dist/index.js";

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;
const graphInfoElem = document.getElementById("graphInfo") as HTMLElement;
const addBarButton = document.getElementById("addBarButton") as HTMLElement;
const removeBarButton = document.getElementById(
	"removeBarButton",
) as HTMLElement;

const canvasContainer = canvas.parentElement as HTMLElement;

const width = canvasContainer.clientWidth;
const height = canvasContainer.clientHeight;

const data: { title: string; value: number }[] = [
	{ title: "", value: Math.random() * 100 },
];

const graphManager = await GraphManager.create();
const graph = new BarChart(
	canvas,
	width,
	height,
	data,
	{
		backgroundColor: { r: 10, g: 5, b: 40 },
		barOptions: {
			cornerRadius: 20,
			minWidth: 5,
			minHeight: 7,
			hoverScale: 1.1,
			gap: 20,
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

			if (left + rect.width > canvasContainer.clientWidth) {
				left = positionInfo.x;
			}
		}
		graphInfoElem.style.left = `${left}px`;
		graphInfoElem.style.top = `${positionInfo.y}px`;
	},
);
if (graphManager) {
	graphManager.addGraph(graph);

	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const { width, height } = entry.contentRect;
			graph.resize(width, height);
			graph.update(graphManager.getTimestamp());
			graph.render();
		}
	});
	resizeObserver.observe(canvasContainer);

	addBarButton.onclick = () => {
		data.push({ title: "", value: Math.random() * 100 });
		graph.updateData(data, graphManager.getTimestamp());
	};

	removeBarButton.onclick = () => {
		data.pop();
		console.log(data.length);
		graph.updateData(data, graphManager.getTimestamp());
	};
}

__assembledGraphLogger__.sendLogs();
