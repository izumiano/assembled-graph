import init, {
	type InitOutput,
	BarChart as WasmBarChart,
	Color as WasmColor,
	DataPoint as WasmDataPoint,
} from "./graph-renderer/pkg/graph_renderer.js";

interface DataPoint {
	title: string;
	value: number;
}

interface Color {
	r: number;
	g: number;
	b: number;
	a?: number;
}

type Positioning =
	| {
			top?: number;
			left?: number;
			right?: number;
			bottom?: number;
	  }
	| number;

interface GraphRendererOptions {
	backgroundColor?: Color;
	positioning?: Positioning;
	gap?: number;
	minWidth?: number;
	minHeight?: number;
}

export default class GraphManager {
	private initOutput: InitOutput;

	private constructor(initOutput: InitOutput) {
		this.initOutput = initOutput;
	}

	public static async create() {
		const initOutput = await init();
		return new GraphManager(initOutput);
	}

	public newGraph(
		canvas: HTMLCanvasElement,
		data: DataPoint[],
		options?: GraphRendererOptions,
	) {
		options ??= {};
		return new GraphRenderer(
			canvas,
			this.initOutput.memory,
			data.map((item) => new WasmDataPoint(item.title, item.value)),
			{
				backgroundColor: options.backgroundColor ?? {
					r: 0,
					g: 0,
					b: 0,
					a: 255,
				},
				positioning:
					typeof options.positioning !== "number"
						? {
								top: options.positioning?.top ?? 0,
								left: options.positioning?.left ?? 0,
								right: options.positioning?.right ?? 0,
								bottom: options.positioning?.bottom ?? 0,
							}
						: {
								top: options.positioning,
								left: options.positioning,
								right: options.positioning,
								bottom: options.positioning,
							},
				gap: options.gap ?? 0,
				minWidth: options.minWidth ?? 1,
				minHeight: options.minHeight ?? 1,
			},
		);
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

	private wasmGraphRenderer: WasmBarChart;
	private wasmMemory: WebAssembly.Memory;
	private pixelsArr: Uint8ClampedArray;
	private imageData: ImageData;

	constructor(
		canvas: HTMLCanvasElement,
		memory: WebAssembly.Memory,
		data: WasmDataPoint[],
		options: Required<Omit<GraphRendererOptions, "positioning">> & {
			positioning: Required<Exclude<Positioning, number>>;
		},
	) {
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed getting canvas rendering context");
		}

		this.canvas = canvas;
		this.ctx = ctx;
		this.width = canvas.width;
		this.height = canvas.height;

		this.wasmGraphRenderer = new WasmBarChart(
			data,
			this.width,
			this.height,
			new WasmColor(
				options.backgroundColor.r,
				options.backgroundColor.g,
				options.backgroundColor.b,
				options.backgroundColor.a ?? 255,
			),
			options.positioning.bottom,
			options.positioning.top,
			options.positioning.left,
			options.positioning.right,
			options.gap,
			options.minWidth,
			options.minHeight,
		);
		this.wasmMemory = memory;
		const pixelsPointer = this.wasmGraphRenderer.pixels_ptr();
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

		this.wasmGraphRenderer.resize(width, height);
		const pixelsPointer = this.wasmGraphRenderer.pixels_ptr();
		this.pixelsArr = new Uint8ClampedArray(
			this.wasmMemory.buffer,
			pixelsPointer,
			this.width * this.height * 4,
		);
		this.imageData = new ImageData(this.width, this.height);
	}

	public renderGraph(timestamp: number) {
		this.wasmGraphRenderer.render(timestamp);

		this.imageData.data.set(this.pixelsArr);

		this.ctx.putImageData(this.imageData, 0, 0);
	}
}
