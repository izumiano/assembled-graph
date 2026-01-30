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
	default as BarChart,
	type OnHoverArgs as BarChart_OnHoverArgs,
	type OnSelectionChangeArgs as BarChart_OnSelectionChangeArgs,
} from "./graphTypes/barChart/barChart";
export type {
	OnValueAxisLayoutParams,
	OnLabelsLayoutParams,
} from "./graphTypes/graphRenderer";
export { GraphRenderer } from "./graphTypes/graphRenderer";

export const __assembledGraphLogger__ = {
	trace,
	traceWarn,
	traceWithStacktrace,
	logError,
	logWarn,
	sendLogs,
};
