import { trace } from "@izumiano/vite-logger";
import {
	BarChart as WasmBarChart,
	BarChartLayout as WasmBarChartLayout,
	BarChartOptions as WasmBarChartOptions,
	BarLayout as WasmBarLayout,
	BarOptions as WasmBarOptions,
	ClickingState as WasmClickingState,
	DataPoint as WasmDataPoint,
	Positioning as WasmPositioning,
	ValueAxisLayout as WasmValueAxisLayout,
} from "../../graph-renderer/pkg/graph_renderer.js";

// import {
// 	clamp,
// 	fillTextWithMaxWidth,
// 	roundToNearestMultiple,
// } from "../utils.js";

import {
	type Color,
	type GraphData,
	GraphRenderer,
	type GraphRendererOptions,
	type IGraphRenderer,
	type PointerType,
	type Positioning,
	type WasmGraphRendererInterop,
} from "../graphRenderer.js";
import { colorToWasmColor } from "../wasmUtils.js";
import BarChartGL from "./webGL.js";

export interface DataPoint {
	title: string;
	displayTitle?: string;
	value: number;
}

export type BarChartData = DataPoint[] & GraphData;
type InternalBarChartData = Required<DataPoint>[] & GraphData;

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
	minWidth?: number;
	minHeight?: number;
}

export interface BarChartOptions extends GraphRendererOptions {
	barOptions?: BarOptions;
	titleFontSize?: number;
	valueAxis?: ValueAxisOptions;
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
					options.barOptions.minWidth,
					options.barOptions.minHeight,
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
	getVertexPositions() {
		return this.wasmGraph.get_vertex_positions();
	}
	getVertexColors() {
		return this.wasmGraph.get_vertex_colors();
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
	getHoveredBarIndex() {
		return this.wasmGraph.get_hovered_bar_index();
	}
}

function dataToWasmData(data: BarChartData) {
	return data.map((item) => new WasmDataPoint(item.title, item.value));
}

function dataToInternalData(data: BarChartData) {
	return data.map((data) => {
		return { ...data, displayTitle: data.displayTitle ?? data.title };
	});
}

export type OnSelectionChangeArgs = {
	data: DataPoint;
	positionInfo?: { x: number; y: number; width: number; height: number } | null;
	index: number;
} | null;
type OnSelectionChange = ((args: OnSelectionChangeArgs) => void) | undefined;

export type OnHoverArgs = {
	data: DataPoint;
	positionInfo?: { x: number; y: number; width: number; height: number } | null;
	pointer: { x: number; y: number; type: string };
	index: number;
} | null;
type OnHover = ((args: OnHoverArgs) => void) | undefined;

type PointerCallback<T> =
	| { func: T; includePositionInfo?: false }
	| { func: Exclude<T, undefined>; includePositionInfo: true };

export interface BarChartCallbacks {
	onSelectionChange?: PointerCallback<OnSelectionChange>;
	onHover?: PointerCallback<OnHover>;
}

type InternalBarChartOptions = Required<
	Omit<BarChartOptions, "positioning" | "valueAxis" | "barOptions">
> & {
	positioning: Required<Exclude<Positioning, number>>;
	valueAxis: Required<ValueAxisOptions>;
	barOptions: Required<BarOptions>;
};
export default class BarChart
	extends GraphRenderer<
		WasmBarChart,
		WasmBarChartInterop,
		InternalBarChartOptions,
		BarChartGL
	>
	implements IGraphRenderer
{
	private data: InternalBarChartData;

	private onSelectionChange: OnSelectionChange;
	private onSelectionChangeIncludePositionInfo?: boolean;
	private selectedBarIndex: number | undefined;

	private onHover: OnHover;
	private onHoverIncludePositionInfo?: boolean;
	private hoveredBarIndex?: number;

	constructor(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
		data: BarChartData,
		options?: BarChartOptions,
		callbacks?: BarChartCallbacks,
	) {
		trace();
		options ??= {};

		const internalOptions = {
			backgroundColor: options.backgroundColor ?? {
				r: 0,
				g: 0,
				b: 0,
				a: 255,
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
				minWidth: (options.barOptions?.minWidth ?? 1) * devicePixelRatio,
				minHeight: (options.barOptions?.minHeight ?? 1) * devicePixelRatio,
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
		};

		super(
			canvas,
			width,
			height,
			new BarChartGL(canvas, options.backgroundColor ?? { r: 0, g: 0, b: 0 }),
			internalOptions,
		);

		this.data = dataToInternalData(data);
		this.onSelectionChange = callbacks?.onSelectionChange?.func;
		this.onSelectionChangeIncludePositionInfo =
			callbacks?.onSelectionChange?.includePositionInfo;
		this.onHover = callbacks?.onHover?.func;
		this.onHoverIncludePositionInfo = callbacks?.onHover?.includePositionInfo;
	}

	public getPositionInfoForBarAt(index: number) {
		return {
			x: this.wasmGraphRenderer.getBarXAt(index) / devicePixelRatio,
			y: this.wasmGraphRenderer.getBarYAt(index) / devicePixelRatio,
			width: this.wasmGraphRenderer.getBarWidthAt(index) / devicePixelRatio,
			height: this.wasmGraphRenderer.getBarHeightAt(index) / devicePixelRatio,
		};
	}

	// private drawTitle(index: number) {
	// 	const barX = this.wasmGraphRenderer.getBarXAt(index);
	// 	const barWidth = this.wasmGraphRenderer.getBarWidthAt(index);
	// 	let x = barX - this.options.barOptions.gap * 0.5;
	// 	const diff = x - this.options.valueAxis.width;
	// 	let width = barWidth + this.options.barOptions.gap + (diff < 0 ? diff : 0);
	// 	x = clamp(x, { min: this.options.valueAxis.width });
	// 	width = clamp(width, { max: this.width - x });
	// 	const y = this.height - this.options.positioning.bottom;

	// 	// fillTextWithMaxWidth(
	// 	// 	this.ctx,
	// 	// 	this.data[index].displayTitle,
	// 	// 	x / devicePixelRatio,
	// 	// 	y / devicePixelRatio,
	// 	// 	width / devicePixelRatio,
	// 	// 	{
	// 	// 		horizontalAlignment: "center",
	// 	// 		centerPoint: (barX + barWidth / 2) / devicePixelRatio,
	// 	// 	},
	// 	// );
	// }

	public updateData(data: BarChartData, timestamp: number) {
		trace(data);
		if (data === this.data) {
			return;
		}

		if (data.length === this.data.length) {
			let hasDifference = false;
			for (let i = 0; i < data.length; i++) {
				const newDataPoint = data[i];
				const oldDataPoint = this.data[i];

				if (
					!oldDataPoint ||
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
		}

		this.data = dataToInternalData(data);
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
		trace();
		this.wasmGraphRenderer.wasmGraph.free();
		this.removeInputEventHandlers();
	}

	public onPointerDown(pointerType: string) {
		if (pointerType !== "mouse") {
			this.onPointerMove(pointerType);
		}

		const selectedBarIndex = this.wasmGraphRenderer.getSelectedBarIndex();

		if (selectedBarIndex === this.selectedBarIndex || !this.onSelectionChange) {
			return;
		}
		this.selectedBarIndex = selectedBarIndex;

		if (selectedBarIndex == null || selectedBarIndex >= this.data.length) {
			this.onSelectionChange(null);
			return;
		}

		this.onSelectionChange({
			data: this.data[selectedBarIndex],
			positionInfo: this.onSelectionChangeIncludePositionInfo
				? this.getPositionInfoForBarAt(selectedBarIndex)
				: null,
			index: selectedBarIndex,
		});
	}

	public onPointerMove(pointerType: string) {
		const hoveredBarIndex = this.wasmGraphRenderer.getHoveredBarIndex();
		if (!this.onHover) {
			return;
		}

		if (hoveredBarIndex == null) {
			if (this.hoveredBarIndex != null) {
				this.onHover(null);
				this.hoveredBarIndex = undefined;
			}
			return;
		}

		if (hoveredBarIndex >= this.data.length) {
			return;
		}
		this.hoveredBarIndex = hoveredBarIndex;
		this.onHover({
			data: this.data[hoveredBarIndex],
			positionInfo: this.onHoverIncludePositionInfo
				? this.getPositionInfoForBarAt(hoveredBarIndex)
				: null,
			index: hoveredBarIndex,
			pointer: {
				x: this.pointer.x / devicePixelRatio,
				y: this.pointer.y / devicePixelRatio,
				type: pointerType,
			},
		});
	}

	public onPointerLeave() {
		this.onHover?.(null);
		this.hoveredBarIndex = undefined;
	}

	public update(timestamp: number) {
		trace();
		this.wasmGraphRenderer.update(timestamp, this.pointer);

		const vertexArr = this.wasmGraphRenderer.getVertexPositions();
		const colorsArr = this.wasmGraphRenderer.getVertexColors();

		this.glRenderer.updatePositionsBuffer(vertexArr);
		this.glRenderer.updateColorsBuffer(colorsArr);
	}

	public render(timestamp: number) {
		trace({ width: this.width, height: this.height });
		super.render(timestamp);

		// this.ctx.font = `${this.options.titleFontSize}px Arial`;
		// this.ctx.fillStyle = "white";
		// const scaleLinesLen = this.wasmGraphRenderer.getScaleLinesCount();
		// for (let i = 0; i < scaleLinesLen; i++) {
		// 	fillTextWithMaxWidth(
		// 		this.ctx,
		// 		`${roundToNearestMultiple(this.wasmGraphRenderer.getScaleLineValueAt(i), this.options.valueAxis.smallestScale)}`,
		// 		0,
		// 		(this.wasmGraphRenderer.getScaleLineYAt(i) +
		// 			this.options.titleFontSize / 2) /
		// 			devicePixelRatio,
		// 		(this.wasmGraphRenderer.getScaleLineXAt(i) - 10) / devicePixelRatio,
		// 		{ horizontalAlignment: "right" },
		// 	);

		// 	// this.ctx.strokeStyle = "red";
		// 	// this.ctx.strokeRect(
		// 	// 	0,
		// 	// 	this.wasmGraphRenderer.getScaleLineYAt(i),
		// 	// 	this.options.valueAxis.width,
		// 	// 	this.options.valueAxis.minPixelDistance,
		// 	// );
		// }

		// this.ctx.font = `${this.options.titleFontSize}px Arial`;
		// this.ctx.fillStyle = "white";
		// const barsLen = this.wasmGraphRenderer.getBarsLen();

		// for (let i = 0; i < barsLen; i++) {
		// 	this.drawTitle(i);
		// }
	}

	public isAnimating() {
		return this.wasmGraphRenderer.getIsAnimating();
	}
}
