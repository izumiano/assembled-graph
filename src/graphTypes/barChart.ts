import {
	BarChart as WasmBarChart,
	BarChartOptions as WasmBarChartOptions,
	BarChartLayout as WasmBarChartLayout,
	BarLayout as WasmBarLayout,
	BarOptions as WasmBarOptions,
	ClickingState as WasmClickingState,
	DataPoint as WasmDataPoint,
	Positioning as WasmPositioning,
	ValueAxisLayout as WasmValueAxisLayout,
} from "../graph-renderer/pkg/graph_renderer.js";
import { fillTextWithMaxWidth, roundToNearestMultiple } from "../utils.js";

import {
	type Color,
	type GraphData,
	GraphRenderer,
	type GraphRendererOptions,
	type IGraphRenderer,
	type PointerType,
	type Positioning,
	type WasmGraphRendererInterop,
} from "./graphRenderer";
import { colorToWasmColor } from "./wasmUtils.js";

export interface DataPoint {
	title: string;
	value: number;
}

export type BarChartData = DataPoint[] & GraphData;

type ValueAxisOptions = {
	width?: number;
	color?: Color;
	smallestScale?: number;
	minPixelDistance?: number;
};

interface BarOptions {
	gap?: number;
	hoverScale?: number;
	color?: Color;
	hoverColor?: Color;
	selectedColor?: Color;
	cornerRadius?: number;
}

export interface BarChartOptions extends GraphRendererOptions {
	barOptions?: BarOptions;
	titleFontSize?: number;
	valueAxis?: ValueAxisOptions;
	minWidth?: number;
	minHeight?: number;
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

			new WasmBarChartLayout(
				new WasmPositioning(
					options.positioning.bottom + options.titleFontSize * devicePixelRatio,
					options.positioning.top,
					options.positioning.left,
					options.positioning.right,
				),
				new WasmBarLayout(
					options.barOptions.gap,
					options.barOptions.cornerRadius,
					options.minWidth,
					options.minHeight,
				),
				new WasmValueAxisLayout(
					options.valueAxis.width,
					options.valueAxis.smallestScale,
					options.valueAxis.minPixelDistance,
				),
			),

			new WasmBarChartOptions(
				colorToWasmColor(options.backgroundColor),

				new WasmBarOptions(
					colorToWasmColor(options.barOptions.color),
					colorToWasmColor(options.barOptions.hoverColor),
					colorToWasmColor(options.barOptions.selectedColor),
					options.barOptions.hoverScale,
				),

				colorToWasmColor(options.valueAxis.color),
			),
		);
	}
	updateData(data: WasmDataPoint[], timestamp: number) {
		this.wasmGraph.update_data(data, timestamp);
	}

	getPixelsPtr() {
		return this.wasmGraph.pixels_ptr();
	}
	resize(width: number, height: number) {
		this.wasmGraph.resize(width, height);
	}
	update(timestamp: number, pointer: PointerType) {
		let clickingState: WasmClickingState;

		switch (pointer.clickingState) {
			case "None":
				clickingState = WasmClickingState.None;
				break;
			case "Holding":
				clickingState = WasmClickingState.Holding;
				break;
			case "JustReleased":
				clickingState = WasmClickingState.JustReleased;
				break;
			default:
				clickingState = WasmClickingState.None;
		}

		this.wasmGraph.update(timestamp, pointer.x, pointer.y, clickingState);
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
	getBarHeightAt(i: number) {
		return this.wasmGraph.get_bar_height_at(i);
	}
	getBarTitleAt(i: number) {
		return this.wasmGraph.get_bar_title_at(i);
	}
	getBarXAt(i: number) {
		return this.wasmGraph.get_bar_x_at(i);
	}
	getBarYAt(i: number) {
		return this.wasmGraph.get_bar_y_at(i);
	}
	getSelectedBarIndex() {
		return this.wasmGraph.get_selected_bar_index();
	}
}

function dataToWasmData(data: BarChartData) {
	return data.map((item) => new WasmDataPoint(item.title, item.value));
}

type InternalBarChartOptions = Required<
	Omit<BarChartOptions, "positioning" | "valueAxis" | "barOptions">
> & {
	positioning: Required<Exclude<Positioning, number>>;
	valueAxis: Required<ValueAxisOptions>;
	barOptions: Required<BarOptions>;
};
export default class BarChart
	extends GraphRenderer<WasmBarChart, WasmBarChartInterop>
	implements IGraphRenderer
{
	private options: InternalBarChartOptions;
	private data: BarChartData;
	private onSelectionChange:
		| ((
				_: {
					data: DataPoint;
					positionInfo: { x: number; y: number; width: number; height: number };
					index: number;
				} | null,
		  ) => void)
		| undefined;

	private selectedBarIndex: number | undefined;

	constructor(
		canvas: HTMLCanvasElement,
		data: BarChartData,
		options: BarChartOptions,
		onSelectionChange?: (
			_: {
				data: DataPoint;
				positionInfo: { x: number; y: number; width: number; height: number };
				index: number;
			} | null,
		) => void,
	) {
		super(canvas);

		this.data = data;
		this.onSelectionChange = onSelectionChange;
		this.options = {
			backgroundColor: options.backgroundColor ?? {
				r: 0,
				g: 0,
				b: 0,
			},
			positioning:
				typeof options.positioning !== "number"
					? {
							top: (options.positioning?.top ?? 0) * devicePixelRatio,
							left: (options.positioning?.left ?? 0) * devicePixelRatio,
							right: (options.positioning?.right ?? 0) * devicePixelRatio,
							bottom: (options.positioning?.bottom ?? 0) * devicePixelRatio,
						}
					: {
							top: options.positioning * devicePixelRatio,
							left: options.positioning * devicePixelRatio,
							right: options.positioning * devicePixelRatio,
							bottom: options.positioning * devicePixelRatio,
						},
			barOptions: {
				gap: (options.barOptions?.gap ?? 10) * devicePixelRatio,
				cornerRadius:
					(options.barOptions?.cornerRadius ?? 10) * devicePixelRatio,
				hoverScale: options.barOptions?.hoverScale ?? 1.1,
				color: options.barOptions?.color ?? { r: 255, g: 255, b: 255 },
				hoverColor: options.barOptions?.hoverColor ?? {
					r: 150,
					g: 150,
					b: 150,
					a: 127,
				},
				selectedColor: options.barOptions?.selectedColor ?? {
					r: 100,
					g: 100,
					b: 255,
				},
			},
			titleFontSize: options.titleFontSize ?? 10,
			valueAxis: {
				width: (options.valueAxis?.width ?? 0) * devicePixelRatio,
				color: options.valueAxis?.color ?? { r: 255, g: 255, b: 255 },
				smallestScale:
					(options.valueAxis?.smallestScale ?? 1) * devicePixelRatio,
				minPixelDistance:
					(options.valueAxis?.minPixelDistance ?? 20) * devicePixelRatio,
			},
			minWidth: (options.minWidth ?? 1) * devicePixelRatio,
			minHeight: (options.minHeight ?? 1) * devicePixelRatio,
		};
	}
	updateData(data: BarChartData, timestamp: number) {
		if (data === this.data) {
			return;
		}

		if (data.length !== this.data.length) {
			throw new Error("Changing length of data is not yet supported");
		}

		let hasDifference = false;
		for (let i = 0; i < data.length; i++) {
			const newDataPoint = data[i];
			const oldDataPoint = this.data[i];

			if (
				newDataPoint.value !== oldDataPoint.value ||
				newDataPoint.title !== oldDataPoint.title
			) {
				hasDifference = true;
				break;
			}
		}
		if (!hasDifference) {
			return;
		}

		this.data = data;
		this.wasmGraphRenderer.updateData(dataToWasmData(data), timestamp);
		this.wasmGraphRenderer.update(timestamp, this.pointer);
	}

	public init(memory: WebAssembly.Memory, startTimestamp: number): void {
		const wasmGraphRenderer = new WasmBarChartInterop({
			data: dataToWasmData(this.data),
			startTimestamp,
			width: this.canvas.width,
			height: this.canvas.height,
			options: this.options,
		});

		super._init(memory, wasmGraphRenderer);
	}

	public dispose() {
		this.wasmGraphRenderer.wasmGraph.free();
		this.removeInputEventHandlers();
	}

	public update(timestamp: number): void {
		this.wasmGraphRenderer.update(timestamp, this.pointer);

		const selectedBarIndex = this.wasmGraphRenderer.getSelectedBarIndex();

		if (selectedBarIndex !== this.selectedBarIndex) {
			this.selectedBarIndex = selectedBarIndex;

			this.onSelectionChange?.(
				selectedBarIndex != null && this.data.length >= selectedBarIndex
					? {
							// biome-ignore lint/style/noNonNullAssertion: <we are checking length>
							data: this.data[selectedBarIndex]!,
							positionInfo: {
								x:
									this.wasmGraphRenderer.getBarXAt(selectedBarIndex) /
									devicePixelRatio,
								y:
									this.wasmGraphRenderer.getBarYAt(selectedBarIndex) /
									devicePixelRatio,
								width:
									this.wasmGraphRenderer.getBarWidthAt(selectedBarIndex) /
									devicePixelRatio,
								height:
									this.wasmGraphRenderer.getBarHeightAt(selectedBarIndex) /
									devicePixelRatio,
							},
							index: selectedBarIndex,
						}
					: null,
			);
		}
	}

	public render() {
		// console.log("render");
		super.render();

		this.ctx.font = `${this.options.titleFontSize}px Arial`;
		this.ctx.fillStyle = "white";
		const scaleLinesLen = this.wasmGraphRenderer.getScaleLinesCount();
		for (let i = 0; i < scaleLinesLen; i++) {
			fillTextWithMaxWidth(
				this.ctx,
				`${roundToNearestMultiple(this.wasmGraphRenderer.getScaleLineValueAt(i), this.options.valueAxis.smallestScale)}`,
				0,
				(this.wasmGraphRenderer.getScaleLineYAt(i) +
					this.options.titleFontSize / 2) /
					devicePixelRatio,
				(this.wasmGraphRenderer.getScaleLineXAt(i) - 10) / devicePixelRatio,
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
				this.wasmGraphRenderer.getBarXAt(i) / devicePixelRatio,
				(this.height - this.options.positioning.bottom) / devicePixelRatio,
				width / devicePixelRatio,
				{ horizontalAlignment: "center" },
			);
		}
	}

	public isAnimating() {
		return this.wasmGraphRenderer.getIsAnimating();
	}
}
