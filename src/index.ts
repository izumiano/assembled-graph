import init, { get_array } from "./graph-renderer/pkg/graph_renderer.js";

export default class GraphManager {
	private constructor() {}

	public static async create() {
		await init();
		return new GraphManager();
	}

	public newGraph(canvas: HTMLCanvasElement) {
		return new GraphRenderer(canvas);
	}
}

class GraphRenderer {
	private ctx: CanvasRenderingContext2D;
	private width: number;
	private height: number;

	private arr: Uint8Array;
	private imageData: ImageData;

	constructor(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed getting canvas rendering context");
		}

		this.ctx = ctx;
		this.width = canvas.width;
		this.height = canvas.height;

		this.arr = new Uint8Array(this.width * this.height * 4);
		this.imageData = ctx.createImageData(this.width, this.height);
	}

	public renderGraph(timestamp: number) {
		this.ctx.fillStyle = "black";
		this.ctx.fillRect(0, 0, this.width, this.height);

		const data = get_array(this.width, this.height, timestamp, this.arr);

		this.imageData.data.set(data);

		this.ctx.putImageData(this.imageData, 0, 0);
	}
}
