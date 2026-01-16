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

function randomInt() {
	return Math.floor(Math.random() * 100 + 0.5);
}

const canvasContainer = canvas.parentElement as HTMLElement;

const width = canvasContainer.clientWidth;
const height = canvasContainer.clientHeight;

const data: { title: string; displayTitle?: string; value: number }[] = [
	{ title: "0", displayTitle: "", value: randomInt() },
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
			gap: 50,
		},
		titleFontSize: 15,
		valueAxis: { width: 40, minPixelDistance: 35 },
		positioning: { bottom: 30, top: 20, left: 10, right: 10 },
	},
	{
		onHover: {
			func: (info) => {
				console.log(info);
				if (!info) {
					graphInfoElem.classList.add("hidden");
					return;
				}
				graphInfoElem.classList.remove("hidden");

				const { data, pointer } = info;

				graphInfoElem.innerText = `${data.title}: ${data.value}`;

				const rect = graphInfoElem.getBoundingClientRect();

				let left = pointer.x;

				if (left + rect.width > canvasContainer.clientWidth) {
					left = canvasContainer.clientWidth - rect.width;
				}

				let top = pointer.y - rect.height * (pointer.type === "touch" ? 2 : 1);
				if (top + canvasContainer.offsetTop < 0) {
					top = -canvasContainer.offsetTop;
				}

				graphInfoElem.style.left = `${left}px`;
				graphInfoElem.style.top = `${top}px`;
			},
		},
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
		data.push({
			title: `${data.length}`,
			displayTitle: "",
			value: randomInt(),
		});
		graph.updateData(data, graphManager.getTimestamp());
	};

	removeBarButton.onclick = () => {
		data.pop();
		graph.updateData(data, graphManager.getTimestamp());
	};
}

__assembledGraphLogger__.sendLogs();
