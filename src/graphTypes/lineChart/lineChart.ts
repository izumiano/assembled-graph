import { logWarn, trace } from "@izumiano/vite-logger";
import {
	LineChartLayout as WasmLineChartLayout,
	ClickingState as WasmClickingState,
	LineChartDataPoint as WasmDataPoint,
	LineChart as WasmLineChart,
	Positioning as WasmPositioning,
	PointLayout as WasmPointLayout,
	ValueAxisLayout as WasmValueAxisLayout,
	LineChartOptions as WasmLineChartOptions,
	PointOptions as WasmPointOptions,
} from "../../graph-renderer/pkg/graph_renderer";
// import type { ClickingState } from "../../graphManager";
import { clamp, roundToNearestMultiple, type DeepRequired } from "../../utils";
import type {
	OnValueAxisLayout,
	PointerCallback,
	ValueAxisOptions,
} from "../shared/types";
import {
	GraphRenderer,
	type Color,
	type GraphData,
	type GraphRendererOptions,
	type IGraphRenderer,
	type InternalGraphRendererOptions,
	type PointerType,
	type WasmGraphRendererInterop,
} from "../graphRenderer";
import LineChartGL from "./lineChartGL";
import { colorToWasmColor } from "../wasmUtils";

function dataToWasmData<TLabel>(data: LineChartData<TLabel>) {
	return data.map((item) => new WasmDataPoint(item.x, item.y));
}

function dataToInternalData<TLabel>(data: LineChartData<TLabel>) {
	return data.map((data) => {
		return { ...data };
	});
}

export interface DataPoint<TLabel> {
	label: TLabel;
	x: number;
	y: number;
}

export type LineChartData<TLabel> = DataPoint<TLabel>[] & GraphData;
type InternalLineChartData<TLabel> = Required<DataPoint<TLabel>>[] & GraphData;

interface PointOptions {
	hoverScale?: number;
	color?: Color;
	hoverColor?: Color;
	selectedColor?: Color;
	radius?: number;
	maxPoints?: number;
}

export interface LineChartOptions extends GraphRendererOptions {
	pointOptions?: PointOptions;
	valueAxis?: ValueAxisOptions;
}
type InternalLineChartOptions = InternalGraphRendererOptions &
	DeepRequired<LineChartOptions>;

type PositionInfo = {
	x: number;
	y: number;
} | null;

export type OnSelectionChangeArgs<TLabel> = {
	data: DataPoint<TLabel>;
	positionInfo?: PositionInfo;
	index: number;
} | null;
type OnSelectionChange<TLabel> =
	| ((args: OnSelectionChangeArgs<TLabel>) => void)
	| undefined;

export type OnHoverArgs<TLabel> = {
	data: DataPoint<TLabel>;
	positionInfo?: PositionInfo;
	pointer: { x: number; y: number; type: string };
	index: number;
} | null;
type OnHover<TLabel> = ((args: OnHoverArgs<TLabel>) => void) | undefined;

type OnXAxisLayout<TLabel> = (args: OnXAxisLayoutParams<TLabel>) => void;

export type OnXAxisLayoutParams<TLabel> = {
	label: TLabel;
	x: number;
	y: number;
	width: number;
	height: number;
	centerPoint: number;
}[];

export type LineChartCallbacks<TLabel> = {
	onSelectionChange?: PointerCallback<OnSelectionChange<TLabel>>;
	onHover?: PointerCallback<OnHover<TLabel>>;
	onXAxisLayout?: OnXAxisLayout<TLabel>;
	onValueAxisLayout?: OnValueAxisLayout;
};

class WasmLineChartInterop implements WasmGraphRendererInterop<WasmLineChart> {
	wasmGraph: WasmLineChart;
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
		options: InternalLineChartOptions;
	}) {
		this.wasmGraph = new WasmLineChart(
			data,
			startTimestamp,
			width,
			height,
			new WasmLineChartLayout(
				new WasmPositioning(
					options.positioning.bottom,
					options.positioning.top,
					options.positioning.left,
					options.positioning.right,
				),
				new WasmPointLayout(options.pointOptions.radius),
				new WasmValueAxisLayout(
					options.valueAxis.width,
					options.valueAxis.smallestScale,
					options.valueAxis.minPixelDistance,
				),
			),

			new WasmLineChartOptions(
				colorToWasmColor(options.backgroundColor),

				new WasmPointOptions(
					colorToWasmColor(options.pointOptions.color),
					colorToWasmColor(options.pointOptions.hoverColor),
					colorToWasmColor(options.pointOptions.selectedColor),
					options.pointOptions.hoverScale,
					options.pointOptions.maxPoints,
				),

				colorToWasmColor(options.valueAxis.color),
			),
		);
	}
	getPointsLen() {
		return this.wasmGraph.get_points_len();
	}
	getPointXAt(index: number) {
		return this.wasmGraph.get_point_x_at(index);
	}
	getPointYAt(index: number) {
		return this.wasmGraph.get_point_y_at(index);
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
	getSelectedPointIndex() {
		return this.wasmGraph.get_selected_point_index();
	}
	getHoveredPointIndex() {
		return this.wasmGraph.get_hovered_point_index();
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
	updateData(data: WasmDataPoint[], timestamp: number) {
		this.wasmGraph.update_data(data, timestamp);
	}
	getIsAnimating() {
		return this.wasmGraph.get_is_animating();
	}
}

export default class LineChart<TLabel>
	extends GraphRenderer<
		WasmLineChart,
		WasmLineChartInterop,
		InternalLineChartOptions,
		LineChartGL,
		LineChartData<TLabel>
	>
	implements IGraphRenderer
{
	private data: InternalLineChartData<TLabel>;

	private onSelectionChange: OnSelectionChange<TLabel>;
	private onSelectionChangeIncludePositionInfo?: boolean;
	private selectedPointIndex: number | undefined;

	private onHover: OnHover<TLabel>;
	private onHoverIncludePositionInfo?: boolean;
	private hoveredPointIndex?: number;

	private onXAxisLayout?: OnXAxisLayout<TLabel>;
	private onYAxisLayout?: OnValueAxisLayout;

	constructor(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
		data: LineChartData<TLabel>,
		{
			options,
			onSelectionChange,
			onHover,
			onXAxisLayout,
			onValueAxisLayout: onYAxisLayout,
		}: {
			options?: LineChartOptions;
		} & LineChartCallbacks<TLabel>,
	) {
		trace();
		options ??= {};

		const backgroundColor = options.backgroundColor ?? {
			r: 0,
			g: 0,
			b: 0,
		};

		const internalOptions: InternalLineChartOptions = {
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
			pointOptions: {
				radius: (options.pointOptions?.radius ?? 10) * devicePixelRatio,
				hoverScale: options.pointOptions?.hoverScale ?? 1.1,
				color: options.pointOptions?.color ?? { r: 255, g: 255, b: 255 },
				hoverColor: options.pointOptions?.hoverColor ?? {
					r: 150,
					g: 150,
					b: 150,
					a: 127,
				},
				selectedColor: options.pointOptions?.selectedColor ?? {
					r: 100,
					g: 100,
					b: 255,
				},
				maxPoints: options.pointOptions?.maxPoints ?? 1000,
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
			new LineChartGL({
				canvas,
				backgroundColor: options.backgroundColor ?? { r: 0, g: 0, b: 0 },
			}),
			internalOptions,
		);

		this.data = dataToInternalData(data);
		this.onSelectionChange = onSelectionChange?.func;
		this.onSelectionChangeIncludePositionInfo =
			onSelectionChange?.includePositionInfo;
		this.onHover = onHover?.func;
		this.onHoverIncludePositionInfo = onHover?.includePositionInfo;
		this.onXAxisLayout = onXAxisLayout;
		this.onYAxisLayout = onYAxisLayout;
	}

	public updateData(data: LineChartData<TLabel>, timestamp: number) {
		trace(data);
		if (data === this.data) {
			return;
		}

		if (data.length > this.options.pointOptions.maxPoints) {
			logWarn(
				`Cannot update data to length greater than maxPoints, {${data.length}}, {${this.options.pointOptions.maxPoints}}`,
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
					newDataPoint.y !== oldDataPoint.y ||
					newDataPoint.x !== oldDataPoint.x ||
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
		const wasmGraphRenderer = new WasmLineChartInterop({
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

	public getPositionInfoForBarAt(index: number) {
		return {
			x: this.wasmGraphRenderer.getPointXAt(index) / devicePixelRatio,
			y: this.wasmGraphRenderer.getPointYAt(index) / devicePixelRatio,
		};
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
		this.options.valueAxis.width > 0 && this.onYAxisLayout?.(valueAxisLayout);
		//
		const labelsLayout = [];
		const barsLen = this.wasmGraphRenderer.getPointsLen();
		for (let i = 0; i < barsLen; i++) {
			const barX = this.wasmGraphRenderer.getPointXAt(i);
			const barWidth = 10; // TODO
			let x = barX;
			const diff = x - this.options.valueAxis.width;
			let width = barWidth + (diff < 0 ? diff : 0);
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
		this.options.positioning.bottom > 0 && this.onXAxisLayout?.(labelsLayout);
	}

	public onPointerDown(pointerType: string) {
		if (pointerType !== "mouse") {
			this.onPointerMove(pointerType);
		}
	}

	public onPointerUp(_pointerType: string) {
		const selectedBarIndex = this.wasmGraphRenderer.getSelectedPointIndex();
		if (
			selectedBarIndex === this.selectedPointIndex ||
			!this.onSelectionChange
		) {
			return;
		}
		this.selectedPointIndex = selectedBarIndex;
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
		const hoveredBarIndex = this.wasmGraphRenderer.getHoveredPointIndex();
		if (!this.onHover) {
			return;
		}
		if (hoveredBarIndex == null) {
			if (this.hoveredPointIndex != null) {
				this.onHover(null);
				this.hoveredPointIndex = undefined;
			}
			return;
		}
		if (hoveredBarIndex >= this.data.length) {
			return;
		}
		this.hoveredPointIndex = hoveredBarIndex;
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
		this.hoveredPointIndex = undefined;
	}

	public update(timestamp: number) {
		trace();
		const lineChartData = this.wasmGraphRenderer.update(
			timestamp,
			this.pointer,
		);

		this.glRenderer.updateGeneralBuffers(
			lineChartData.vertex_array_general,
			lineChartData.colors_array_general,
		);

		this.glRenderer.updatePointsBuffers(
			lineChartData.vertex_array_points,
			lineChartData.colors_array_points,
		);

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
