import { Color as WasmColor } from "../graph-renderer/pkg/graph_renderer";
import { clamp } from "../utils";
import type { Color } from "./graphRenderer";

export function colorToWasmColor(color: Color) {
	return new WasmColor(
		clamp(Math.floor(color.r), { min: 0, max: 255 }),
		clamp(Math.floor(color.g), { min: 0, max: 255 }),
		clamp(Math.floor(color.b), { min: 0, max: 255 }),
		clamp(Math.floor(color.a ?? 255), { min: 0, max: 255 }),
	);
}
