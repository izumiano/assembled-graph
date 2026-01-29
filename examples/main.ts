import {
	__assembledGraphLogger__,
	BarChart,
	GraphManager,
} from "../dist/index.js";

const canvas = document.getElementById("graphCanvas") as HTMLCanvasElement;
const valueAxis = document.getElementById("valueAxis") as HTMLElement;
const titlesContainer = document.getElementById(
	"titlesContainer",
) as HTMLElement;
const graphInfoElem = document.getElementById("graphInfo") as HTMLElement;
const addBarButton = document.getElementById("addBarButton") as HTMLElement;
const removeBarButton = document.getElementById(
	"removeBarButton",
) as HTMLElement;

function randomInt() {
	return Math.floor(Math.random() * 100 + 0.5);
}

function measureElemNotInDocument(elem: HTMLElement) {
	const prevVisibility = elem.style.visibility;
	const prevPositionStyle = elem.style.position;

	elem.style.visibility = "hidden";
	elem.style.position = "absolute";
	document.body.appendChild(elem);
	const boundingRect = elem.getBoundingClientRect();
	document.body.removeChild(elem);
	elem.style.visibility = prevVisibility;
	elem.style.position = prevPositionStyle;

	return boundingRect;
}

const canvasContainer = canvas.parentElement as HTMLElement;

const width = canvasContainer.clientWidth;
const height = canvasContainer.clientHeight;

const data: { title: string; value: number }[] = [
	{ title: "0", value: randomInt() },
	{ title: "1", value: randomInt() },
];

const graphManager = await GraphManager.create();
const graph = new BarChart(canvas, width, height, data, {
	options: {
		backgroundColor: { r: 10, g: 5, b: 40 },
		barOptions: {
			cornerRadius: 20,
			minWidth: 5,
			minHeight: 7,
			hoverScale: 1.1,
			gap: 20,
		},
		valueAxis: {
			width: 40,
			minPixelDistance: 35,
		},
		positioning: { bottom: 30, top: 20, left: 10, right: 20 },
	},
	callbacks: {
		onValueAxisLayout: (layout) => {
			const elements: Node[] = [];
			for (const item of layout) {
				const { value, x, y, width } = item;

				const elem = document.createElement("span");
				elem.innerText = `${value}`;
				elem.classList.add("titleItem", "rightAlign");
				const boundingRect = measureElemNotInDocument(elem);
				elem.style.left = `calc(${x}px - 0.5%)`;
				elem.style.top = `${y - boundingRect.height / 2}px`;
				elem.style.width = `${width}px`;

				elements.push(elem);
			}

			valueAxis.replaceChildren(...elements);
		},
		onTitleLayout: (layout) => {
			const elements: Node[] = [];
			for (const item of layout) {
				const { title, x, y, width, height, centerPoint } = item;

				const elem = document.createElement("span");
				elem.innerText = title;
				elem.classList.add("titleItem");
				const boundingRect = measureElemNotInDocument(elem);
				const xOffset = centerPoint - boundingRect.width / 2;
				elem.style.left = `${x + xOffset}px`;
				elem.style.top = `${y}px`;

				elem.style.width = `${width - xOffset}px`;
				elem.style.height = `${height}px`;

				elements.push(elem);
			}

			titlesContainer.replaceChildren(...elements);
		},
		onHover: {
			func: (info) => {
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
});
if (graphManager) {
	graphManager.addGraph(graph);

	const resizeObserver = new ResizeObserver((entries) => {
		for (const entry of entries) {
			const { width, height } = entry.contentRect;
			graph.resize(width, height);
			const timestamp = graphManager.getTimestamp();
			graph.update(timestamp);
			graph.render(timestamp);
		}
	});
	resizeObserver.observe(canvasContainer);

	addBarButton.onclick = () => {
		data.push({
			title: `${data.length}`,
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
