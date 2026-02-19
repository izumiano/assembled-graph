import { trace } from "@izumiano/vite-logger";
import type { WasmFloat32Array } from "../../graph-renderer/pkg/graph_renderer";
import GeneralProgram from "../shared/generalProgram";
import WebGLRenderer, { type IWebGLRenderer } from "../webGLRenderer";
import { mat4 } from "gl-matrix";
import type { Color } from "../graphRenderer";

export default class LineChartGL
	extends WebGLRenderer
	implements IWebGLRenderer
{
	private program_general: GeneralProgram;

	constructor({
		canvas,
		backgroundColor,
	}: { canvas: HTMLCanvasElement; backgroundColor: Color }) {
		super({
			canvas,
			backgroundColor,
		});

		this.program_general = new GeneralProgram(this.gl);
	}

	public init(memory: WebAssembly.Memory): void {
		this.program_general.init(memory);
	}

	public updateGeneralBuffers(
		positions: WasmFloat32Array,
		colors: WasmFloat32Array,
	) {
		this.program_general.updateBuffers(positions, colors);
	}

	override draw(timestamp: number) {
		trace();
		super.draw(timestamp);

		const projectionMatrix = Array.from(mat4.create());
		const modelViewMatrix = Array.from(mat4.create());

		this.program_general.draw(timestamp, projectionMatrix, modelViewMatrix);
	}
}
