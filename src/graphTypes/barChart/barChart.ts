import { logWarn, trace } from "@izumiano/vite-logger";
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

import {
	type Color,
	devicePixelRatio,
	type GraphData,
	GraphRenderer,
	type GraphRendererOptions,
	type IGraphRenderer,
	type InternalGraphRendererOptions,
	type PointerType,
	type WasmGraphRendererInterop,
} from "../graphRenderer.js";
import { colorToWasmColor } from "../wasmUtils.js";
import BarChartGL from "./barChartGL.js";
import {
	clamp,
	roundToNearestMultiple,
	type DeepRequired,
} from "../../utils.js";
import type {
	DataPoint,
	OnHover,
	OnLabelsLayout,
	OnSelectionChange,
	OnValueAxisLayout,
	PointerCallback,
	ValueAxisOptions,
} from "../shared/types.js";

export type BarChartData<TLabel> = DataPoint<TLabel>[] & GraphData;
type InternalBarChartData<TLabel> = Required<DataPoint<TLabel>>[] & GraphData;

interface BarOptions {
	gap?: number;
	hoverScale?: number;
	color?: Color;
	hoverColor?: Color;
	selectedColor?: Color;
	cornerRadius?: number;
	minWidth?: number;
	minHeight?: number;
	maxBars?: number;
}

export interface BarChartOptions extends GraphRendererOptions {
	barOptions?: BarOptions;
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
					options.positioning.bottom,
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
					options.barOptions.maxBars,
				),

				colorToWasmColor(options.valueAxis.color),
			),
		);
	}
	public updateData(data: WasmDataPoint[], timestamp: number) {
		this.wasmGraph.update_data(data, timestamp);
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

		return this.wasmGraph.update(
			timestamp,
			pointer.x,
			pointer.y,
			clickingState,
		);
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
	getCornerRadius() {
		return this.wasmGraph.get_corner_radius();
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

function dataToWasmData<TLabel>(data: BarChartData<TLabel>) {
	return data.map((item) => new WasmDataPoint(item.value));
}

function dataToInternalData<TLabel>(data: BarChartData<TLabel>) {
	return data.map((data) => {
		return { ...data };
	});
}

export type BarChartCallbacks<TLabel> = {
	onSelectionChange?: PointerCallback<OnSelectionChange<TLabel>>;
	onHover?: PointerCallback<OnHover<TLabel>>;
	onLabelsLayout?: OnLabelsLayout<TLabel>;
	onValueAxisLayout?: OnValueAxisLayout;
};

type InternalBarChartOptions = InternalGraphRendererOptions &
	DeepRequired<BarChartOptions>;

export default class BarChart<TLabel>
	extends GraphRenderer<
		WasmBarChart,
		WasmBarChartInterop,
		InternalBarChartOptions,
		BarChartGL,
		BarChartData<TLabel>
	>
	implements IGraphRenderer
{
	private data: InternalBarChartData<TLabel>;

	private onSelectionChange: OnSelectionChange<TLabel>;
	private onSelectionChangeIncludePositionInfo?: boolean;
	private selectedBarIndex: number | undefined;

	private onHover: OnHover<TLabel>;
	private onHoverIncludePositionInfo?: boolean;
	private hoveredBarIndex?: number;

	private onLabelsLayout?: OnLabelsLayout<TLabel>;
	private onValueAxisLayout?: OnValueAxisLayout;

	constructor(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
		data: BarChartData<TLabel>,
		{
			options,
			onSelectionChange,
			onHover,
			onLabelsLayout,
			onValueAxisLayout,
		}: {
			options?: BarChartOptions;
		} & BarChartCallbacks<TLabel>,
	) {
		trace();
		options ??= {};

		const backgroundColor = options.backgroundColor ?? {
			r: 0,
			g: 0,
			b: 0,
		};

		const internalOptions: InternalBarChartOptions = {
			backgroundColor: { ...backgroundColor, a: backgroundColor.a ?? 255 },
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
				maxBars: options.barOptions?.maxBars ?? 1000,
			},
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
			new BarChartGL({
				canvas,
				backgroundColor: options.backgroundColor ?? { r: 0, g: 0, b: 0 },
				maxBars: internalOptions.barOptions.maxBars,
			}),
			internalOptions,
		);

		this.data = dataToInternalData(data);
		this.onSelectionChange = onSelectionChange?.func;
		this.onSelectionChangeIncludePositionInfo =
			onSelectionChange?.includePositionInfo;
		this.onHover = onHover?.func;
		this.onHoverIncludePositionInfo = onHover?.includePositionInfo;
		this.onLabelsLayout = onLabelsLayout;
		this.onValueAxisLayout = onValueAxisLayout;
	}

	public getPositionInfoForBarAt(index: number) {
		return {
			x: this.wasmGraphRenderer.getBarXAt(index) / devicePixelRatio,
			y: this.wasmGraphRenderer.getBarYAt(index) / devicePixelRatio,
			width: this.wasmGraphRenderer.getBarWidthAt(index) / devicePixelRatio,
			height: this.wasmGraphRenderer.getBarHeightAt(index) / devicePixelRatio,
		};
	}

	public updateData(data: BarChartData<TLabel>, timestamp: number) {
		trace(data);
		if (data === this.data) {
			return;
		}

		if (data.length > this.options.barOptions.maxBars) {
			logWarn(
				`Cannot update data to length greater than maxBars, {${data.length}}, {${this.options.barOptions.maxBars}}`,
			);
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
					newDataPoint.label !== oldDataPoint.label
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

		super.updateData(data, timestamp);
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

	public handleLayout() {
		trace();
		const scaleLinesLen = this.wasmGraphRenderer.getScaleLinesCount();

		const valueAxisLayout = [];

		for (let i = 0; i < scaleLinesLen; i++) {
			valueAxisLayout.push({
				value: roundToNearestMultiple(
					this.wasmGraphRenderer.getScaleLineValueAt(i),
					this.options.valueAxis.smallestScale,
				),
				x: 0,
				y: this.wasmGraphRenderer.getScaleLineYAt(i) / devicePixelRatio,
				width: this.wasmGraphRenderer.getScaleLineXAt(i) / devicePixelRatio,
			});
		}

		this.options.valueAxis.width > 0 &&
			this.onValueAxisLayout?.(valueAxisLayout);

		//

		const labelsLayout = [];

		const barsLen = this.wasmGraphRenderer.getBarsLen();
		for (let i = 0; i < barsLen; i++) {
			const barX = this.wasmGraphRenderer.getBarXAt(i);
			const barWidth = this.wasmGraphRenderer.getBarWidthAt(i);
			let x = barX - this.options.barOptions.gap * 0.5;
			const diff = x - this.options.valueAxis.width;
			let width =
				barWidth + this.options.barOptions.gap + (diff < 0 ? diff : 0);
			x = clamp(x, { min: this.options.valueAxis.width });
			width = clamp(width, { max: this.width - x });
			const y = this.height - this.options.positioning.bottom;

			labelsLayout.push({
				label: this.data[i].label,
				x: x / devicePixelRatio,
				y: y / devicePixelRatio,
				width: width / devicePixelRatio,
				height: this.options.positioning.bottom,
				centerPoint: (barX + barWidth / 2 - x) / devicePixelRatio,
			});
		}

		this.options.positioning.bottom > 0 && this.onLabelsLayout?.(labelsLayout);
	}

	public onPointerDown(pointerType: string) {
		if (pointerType !== "mouse") {
			this.onPointerMove(pointerType);
		}
	}

	public onPointerUp(_pointerType: string) {
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
		const barChartData = this.wasmGraphRenderer.update(timestamp, this.pointer);

		this.glRenderer.updateGeneralBuffers(
			barChartData.vertex_array_general,
			barChartData.colors_array_general,
		);
		this.glRenderer.updateBarsBuffers(
			barChartData.vertex_array_bars,
			barChartData.colors_array_bars,
			barChartData.relative_bar_positions,
		);
		this.glRenderer.setCornerRadius(this.wasmGraphRenderer.getCornerRadius());

		super.update(timestamp);
	}

	public render(timestamp: number) {
		trace({ width: this.width, height: this.height });
		super.render(timestamp);
	}

	public isAnimating() {
		return this.wasmGraphRenderer.getIsAnimating();
	}
}
