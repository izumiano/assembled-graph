import { trace } from "@izumiano/vite-logger";
import WebGLRenderer, { type IWebGLRenderer } from "../webGLRenderer";
import type { Color } from "../graphRenderer";

import { mat4 } from "gl-matrix";
import GeneralProgram from "../shared/generalProgram";
import BarsProgram from "./barsProgram";
import type { WasmFloat32Array } from "../../graph-renderer/pkg/graph_renderer";

export default class BarChartGL
	extends WebGLRenderer
	implements IWebGLRenderer
{
	private program_general: GeneralProgram;
	private program_bars: BarsProgram;

	constructor({
		canvas,
		backgroundColor,
		maxBars,
	}: { canvas: HTMLCanvasElement; backgroundColor: Color; maxBars: number }) {
		super({
			canvas,
			backgroundColor,
		});

		this.program_general = new GeneralProgram(this.gl);
		this.program_bars = new BarsProgram(this.gl, { maxBars });
	}

	public init(memory: WebAssembly.Memory): void {
		this.program_general.init(memory);
		this.program_bars.init(memory);
	}

	public updateGeneralBuffers(
		positions: WasmFloat32Array,
		colors: WasmFloat32Array,
	) {
		this.program_general.updateBuffers(positions, colors);
	}

	public updateBarsBuffers(
		positions: WasmFloat32Array,
		colors: WasmFloat32Array,
		relativeBarPositions: WasmFloat32Array,
	) {
		this.program_bars.updateBuffers(positions, colors, relativeBarPositions);
	}

	public setCornerRadius(cornerRadius: number) {
		this.program_bars.cornerRadius = cornerRadius;
	}

	override draw(timestamp: number) {
		trace();
		super.draw(timestamp);

		const projectionMatrix = Array.from(mat4.create());
		const modelViewMatrix = Array.from(mat4.create());

		this.program_general.draw(timestamp, projectionMatrix, modelViewMatrix);
		this.program_bars.draw(timestamp, projectionMatrix, modelViewMatrix);
	}
}
