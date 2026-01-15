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

if (import.meta.env.VITE_VERBOSE_LOG === "true") {
	console.info("VERBOSE LOGGING ENABLED");
}
