import init, {
	type InitOutput,
	BarChart as WasmBarChart,
	Color as WasmColor,
	DataPoint as WasmDataPoint,
} from "./graph-renderer/pkg/graph_renderer.js";
import { fillTextWithMaxWidth, roundToNearestMultiple } from "./utils.js";

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

type ValueAxisOptions = {
	width?: number;
	smallestScale?: number;
	minPixelDistance?: number;
};

interface GraphRendererOptions {
	startTimestamp?: number;
	backgroundColor?: Color;
	positioning?: Positioning;
	gap?: number;
	titleFontSize?: number;
	valueAxis?: ValueAxisOptions;
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
				startTimestamp: options.startTimestamp ?? 0,
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
				titleFontSize: options.titleFontSize ?? 10,
				valueAxis: {
					width: options.valueAxis?.width ?? 0,
					smallestScale: options.valueAxis?.smallestScale ?? 1,
					minPixelDistance: options.valueAxis?.minPixelDistance ?? 20,
				},
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

type InternalGraphRendererOptions = Required<
	Omit<GraphRendererOptions, "positioning" | "valueAxis">
> & {
	positioning: Required<Exclude<Positioning, number>>;
	valueAxis: Required<ValueAxisOptions>;
};
class GraphRenderer {
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private width: number;
	private height: number;
	private options: InternalGraphRendererOptions;

	private wasmGraphRenderer: WasmBarChart;
	private wasmMemory: WebAssembly.Memory;
	private pixelsArr: Uint8ClampedArray;
	private imageData: ImageData;

	constructor(
		canvas: HTMLCanvasElement,
		memory: WebAssembly.Memory,
		data: WasmDataPoint[],
		options: InternalGraphRendererOptions,
	) {
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed getting canvas rendering context");
		}

		this.canvas = canvas;
		this.ctx = ctx;
		this.width = canvas.width;
		this.height = canvas.height;
		this.options = options;

		this.wasmGraphRenderer = new WasmBarChart(
			data,
			options.startTimestamp,
			this.width,
			this.height,
			new WasmColor(
				options.backgroundColor.r,
				options.backgroundColor.g,
				options.backgroundColor.b,
				options.backgroundColor.a ?? 255,
			),
			options.positioning.bottom + options.titleFontSize,
			options.positioning.top,
			options.positioning.left,
			options.positioning.right,
			options.gap,
			options.minWidth,
			options.minHeight,
			options.valueAxis.width,
			options.valueAxis.smallestScale,
			options.valueAxis.minPixelDistance,
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
		this.wasmGraphRenderer.update(timestamp);
		this.wasmGraphRenderer.render();

		this.imageData.data.set(this.pixelsArr);

		this.ctx.putImageData(this.imageData, 0, 0);

		this.ctx.font = `${this.options.titleFontSize}px Arial`;
		this.ctx.fillStyle = "white";
		const scaleLinesLen = this.wasmGraphRenderer.get_scale_lines_count();
		for (let i = 0; i < scaleLinesLen; i++) {
			fillTextWithMaxWidth(
				this.ctx,
				`${roundToNearestMultiple(this.wasmGraphRenderer.get_scale_line_value_at(i), this.options.valueAxis.smallestScale)}`,
				0,
				this.wasmGraphRenderer.get_scale_line_y_at(i) +
					this.options.titleFontSize / 2,
				this.wasmGraphRenderer.get_scale_line_x_at(i) - 10,
				{ horizontalAlignment: "right" },
			);
		}

		this.ctx.font = `${this.options.titleFontSize}px Arial`;
		this.ctx.fillStyle = "white";
		const barsLen = this.wasmGraphRenderer.get_bars_len();
		for (let i = 0; i < barsLen; i++) {
			const width = this.wasmGraphRenderer.get_bar_width_at(i);
			fillTextWithMaxWidth(
				this.ctx,
				this.wasmGraphRenderer.get_bar_title_at(i),
				this.wasmGraphRenderer.get_bar_x_at(i),
				this.height - this.options.positioning.bottom,
				width,
				{ horizontalAlignment: "center" },
			);
		}
	}
}
