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
	type BarChartCallbacks,
	type BarChartData,
	type BarChartOptions,
	type DataPoint,
	default as BarChart,
	type OnHoverArgs,
	type OnSelectionChangeArgs,
} from "./graphTypes/barChart/barChart";
export { GraphRenderer } from "./graphTypes/graphRenderer";

export const __assembledGraphLogger__ = {
	trace,
	traceWarn,
	traceWithStacktrace,
	logError,
	logWarn,
	sendLogs,
};
