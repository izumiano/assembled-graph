import { logError, logVerbose, logWarn, sendLogs } from "#logger";

export { default as GraphManager } from "./graphManager";
export {
	type BarChartData,
	type BarChartOptions,
	type DataPoint,
	default as BarChart,
	type OnSelectionChange,
	type OnSelectionChangeArgs,
} from "./graphTypes/barChart";
export { GraphRenderer } from "./graphTypes/graphRenderer";

export const __assembledGraphLogger__ = {
	logVerbose,
	logError,
	logWarn,
	sendLogs,
};
