import {
	BarChart as WasmBarChart,
	Color as WasmColor,
	DataPoint as WasmDataPoint,
} from "../graph-renderer/pkg/graph_renderer.js";
import { fillTextWithMaxWidth, roundToNearestMultiple } from "../utils.js";

import {
	GraphRenderer,
	type GraphRendererOptions,
	type IGraphRenderer,
	type PointerType,
	type Positioning,
	type WasmGraphRendererInterop,
} from "./graphRenderer.js";

interface DataPoint {
	title: string;
	value: number;
}

type ValueAxisOptions = {
	width?: number;
	smallestScale?: number;
	minPixelDistance?: number;
};

interface BarChartOptions extends GraphRendererOptions {
	gap?: number;
	titleFontSize?: number;
	barCornerRadius?: number;
	valueAxis?: ValueAxisOptions;
	minWidth?: number;
	minHeight?: number;
	hoverScale?: number;
}

class WasmBarChartInterop implements WasmGraphRendererInterop<WasmBarChart> {
	wasmGraph: WasmBarChart;

	constructor({
		data,
		startTimestamp,
		width,
		height,
		options,
	}: {
		data: WasmDataPoint[];
		startTimestamp: number;
		width: number;
		height: number;
		options: InternalBarChartOptions;
	}) {
		this.wasmGraph = new WasmBarChart(
			data,
			startTimestamp,
			width,
			height,

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
			options.barCornerRadius,
			options.minWidth,
			options.minHeight,
			options.valueAxis.width,
			options.valueAxis.smallestScale,
			options.valueAxis.minPixelDistance,
			options.hoverScale,
		);
	}

	getPixelsPtr() {
		return this.wasmGraph.pixels_ptr();
	}
	resize(width: number, height: number) {
		this.wasmGraph.resize(width, height);
	}
	update(timestamp: number, pointer: PointerType, clicking?: boolean) {
		this.wasmGraph.update(timestamp, pointer?.x, pointer?.y, clicking ?? false);
	}
	render() {
		this.wasmGraph.render();
	}

	getIsAnimating() {
		return this.wasmGraph.get_is_animating();
	}

	getScaleLinesCount() {
		return this.wasmGraph.get_scale_lines_count();
	}
	getScaleLineValueAt(i: number) {
		return this.wasmGraph.get_scale_line_value_at(i);
	}
	getScaleLineYAt(i: number) {
		return this.wasmGraph.get_scale_line_y_at(i);
	}
	getScaleLineXAt(i: number) {
		return this.wasmGraph.get_scale_line_x_at(i);
	}
	getBarsLen() {
		return this.wasmGraph.get_bars_len();
	}
	getBarWidthAt(i: number) {
		return this.wasmGraph.get_bar_width_at(i);
	}
	getBarTitleAt(i: number) {
		return this.wasmGraph.get_bar_title_at(i);
	}
	getBarXAt(i: number) {
		return this.wasmGraph.get_bar_x_at(i);
	}
}

type InternalBarChartOptions = Required<
	Omit<BarChartOptions, "positioning" | "valueAxis">
> & {
	positioning: Required<Exclude<Positioning, number>>;
	valueAxis: Required<ValueAxisOptions>;
};
export default class BarChart
	extends GraphRenderer<WasmBarChart, WasmBarChartInterop>
	implements IGraphRenderer
{
	private options: InternalBarChartOptions;
	private data: DataPoint[];

	constructor(
		canvas: HTMLCanvasElement,
		data: DataPoint[],
		options: BarChartOptions,
	) {
		super(canvas);

		this.data = data;
		this.options = {
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
			barCornerRadius: options.barCornerRadius ?? 10,
			valueAxis: {
				width: options.valueAxis?.width ?? 0,
				smallestScale: options.valueAxis?.smallestScale ?? 1,
				minPixelDistance: options.valueAxis?.minPixelDistance ?? 20,
			},
			minWidth: options.minWidth ?? 1,
			minHeight: options.minHeight ?? 1,
			hoverScale: options.hoverScale ?? 1.1,
		};
	}

	public init(memory: WebAssembly.Memory, startTimestamp: number): void {
		const wasmGraphRenderer = new WasmBarChartInterop({
			data: this.data.map((item) => new WasmDataPoint(item.title, item.value)),
			startTimestamp,
			width: this.canvas.width,
			height: this.canvas.height,
			options: this.options,
		});

		super._init(memory, wasmGraphRenderer);
	}

	public update(
		timestamp: number,
		pointer: PointerType,
		clicking?: boolean,
	): void {
		this.wasmGraphRenderer.update(timestamp, pointer, clicking);
	}

	public render() {
		// console.log("render");
		this.wasmGraphRenderer.render();

		this.imageData.data.set(this.pixelsArr);

		this.ctx.putImageData(this.imageData, 0, 0);

		this.ctx.font = `${this.options.titleFontSize}px Arial`;
		this.ctx.fillStyle = "white";
		const scaleLinesLen = this.wasmGraphRenderer.getScaleLinesCount();
		for (let i = 0; i < scaleLinesLen; i++) {
			fillTextWithMaxWidth(
				this.ctx,
				`${roundToNearestMultiple(this.wasmGraphRenderer.getScaleLineValueAt(i), this.options.valueAxis.smallestScale)}`,
				0,
				this.wasmGraphRenderer.getScaleLineYAt(i) +
					this.options.titleFontSize / 2,
				this.wasmGraphRenderer.getScaleLineXAt(i) - 10,
				{ horizontalAlignment: "right" },
			);

			// this.ctx.strokeStyle = "red";
			// this.ctx.strokeRect(
			// 	0,
			// 	this.wasmGraphRenderer.getScaleLineYAt(i),
			// 	this.options.valueAxis.width,
			// 	this.options.valueAxis.minPixelDistance,
			// );
		}

		this.ctx.font = `${this.options.titleFontSize}px Arial`;
		this.ctx.fillStyle = "white";
		const barsLen = this.wasmGraphRenderer.getBarsLen();
		for (let i = 0; i < barsLen; i++) {
			const width = this.wasmGraphRenderer.getBarWidthAt(i);
			fillTextWithMaxWidth(
				this.ctx,
				this.wasmGraphRenderer.getBarTitleAt(i),
				this.wasmGraphRenderer.getBarXAt(i),
				this.height - this.options.positioning.bottom,
				width,
				{ horizontalAlignment: "center" },
			);
		}
	}

	public isAnimating() {
		return this.wasmGraphRenderer.getIsAnimating();
	}
}
