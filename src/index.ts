import init, {
	Color,
	type InitOutput,
	GraphRenderer as WasmGraphRenderer,
} from "./graph-renderer/pkg/graph_renderer.js";

export default class GraphManager {
	private initOutput: InitOutput;

	private constructor(initOutput: InitOutput) {
		this.initOutput = initOutput;
	}

	public static async create() {
		const initOutput = await init();
		return new GraphManager(initOutput);
	}

	public newGraph(canvas: HTMLCanvasElement) {
		return new GraphRenderer(canvas, this.initOutput.memory);
	}

	public resizeGraph(
		graphRenderer: GraphRenderer,
		width: number,
		height: number,
	) {
		graphRenderer.resize(width, height);
	}
}

class GraphRenderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private width: number;
	private height: number;

	private canvasPixels: WasmGraphRenderer;
	private wasmMemory: WebAssembly.Memory;
	private pixelsArr: Uint8ClampedArray;
	private imageData: ImageData;

	constructor(canvas: HTMLCanvasElement, memory: WebAssembly.Memory) {
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed getting canvas rendering context");
		}

		this.canvas = canvas;
		this.ctx = ctx;
		this.width = canvas.width;
		this.height = canvas.height;

		this.canvasPixels = new WasmGraphRenderer(
			this.width,
			this.height,
			new Color(1, 0, 0, 255),
		);
		this.wasmMemory = memory;
		const pixelsPointer = this.canvasPixels.pixels_ptr();
		this.pixelsArr = new Uint8ClampedArray(
			memory.buffer,
			pixelsPointer,
			this.width * this.height * 4,
		);
		this.imageData = new ImageData(this.width, this.height);
	}

	public resize(width: number, height: number) {
		this.canvas.width = width;
		this.canvas.height = height;

		this.width = this.canvas.width;
		this.height = this.canvas.height;

		this.canvasPixels.resize(width, height);
		const pixelsPointer = this.canvasPixels.pixels_ptr();
		this.pixelsArr = new Uint8ClampedArray(
			this.wasmMemory.buffer,
			pixelsPointer,
			this.width * this.height * 4,
		);
		this.imageData = new ImageData(this.width, this.height);
	}

	public renderGraph(timestamp: number) {
		this.ctx.fillStyle = "black";
		this.ctx.fillRect(0, 0, this.width, this.height);

		this.canvasPixels.update_pixels(timestamp);

		this.imageData.data.set(this.pixelsArr);

		this.ctx.putImageData(this.imageData, 0, 0);
	}
}
