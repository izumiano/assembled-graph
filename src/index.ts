import {
	logError,
	trace,
	logWarn,
	sendLogs,
	traceWarn,
	traceWithStacktrace,
} from "@izumiano/vite-logger";

export { default as GraphManager } from "./graphManager";
export type {
	OnHoverArgs,
	OnSelectionChangeArgs,
	DataPoint,
} from "./graphTypes/shared/types";
export {
	type BarChartData,
	type BarChartOptions,
	type BarChartCallbacks,
	default as BarChart,
} from "./graphTypes/barChart/barChart";
export {
	type LineChartData,
	type LineChartOptions,
	type LineChartCallbacks,
	default as LineChart,
} from "./graphTypes/lineChart/lineChart";
export type {
	OnValueAxisLayoutParams,
	OnLabelsLayoutParams,
} from "./graphTypes/shared/types";
export { GraphRenderer } from "./graphTypes/graphRenderer";

export const __assembledGraphLogger__ = {
	trace,
	traceWarn,
	traceWithStacktrace,
	logError,
	logWarn,
	sendLogs,
};
