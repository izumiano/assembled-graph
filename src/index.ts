import {
	logError,
	trace,
	logWarn,
	sendLogs,
	traceWarn,
	traceWithStacktrace,
} from "@izumiano/vite-logger";

export { default as GraphManager } from "./graphManager";
export {
	type BarChartData,
	type BarChartOptions,
	type BarChartCallbacks,
	type DataPoint as BarChart_DataPoint,
	type OnHoverArgs as BarChart_OnHoverArgs,
	type OnSelectionChangeArgs as BarChart_OnSelectionChangeArgs,
	type OnLabelsLayoutParams as BarChart_OnLabelsLayoutParams,
	default as BarChart,
} from "./graphTypes/barChart/barChart";
export {
	type LineChartData,
	type LineChartOptions,
	type LineChartCallbacks,
	type OnHoverArgs as LineChart_OnHoverArgs,
	type OnSelectionChangeArgs as LineChart_OnSelectionChangeArgs,
	type OnXAxisLayoutParams as LineChart_OnLabelsLayoutParams,
	default as LineChart,
} from "./graphTypes/lineChart/lineChart";
export type { OnValueAxisLayoutParams } from "./graphTypes/shared/types";
export { GraphRenderer } from "./graphTypes/graphRenderer";

export const __assembledGraphLogger__ = {
	trace,
	traceWarn,
	traceWithStacktrace,
	logError,
	logWarn,
	sendLogs,
};
