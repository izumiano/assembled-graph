import type { Color } from "./graphRenderer";
import { trace } from "@izumiano/vite-logger";

export interface IWebGLRenderer {
	init(memory: WebAssembly.Memory): void;
	draw(timestamp: number): void;
}

export default class WebGLRenderer {
	public gl: WebGL2RenderingContext;

	private backgroundColor: Required<Color>;

	protected wasmMemory!: WebAssembly.Memory;

	constructor({
		canvas,
		backgroundColor,
	}: {
		canvas: HTMLCanvasElement;
		backgroundColor: Color;
	}) {
		trace();

		const gl = canvas.getContext("webgl2");

		if (!gl) {
			throw new Error("Failed getting canvas rendering context");
		}

		this.gl = gl;
		this.backgroundColor = { ...backgroundColor, a: backgroundColor.a ?? 255 };
	}

	public draw(_timestamp: number) {
		const gl = this.gl;

		gl.clearColor(
			this.backgroundColor.r / 255,
			this.backgroundColor.g / 255,
			this.backgroundColor.b / 255,
			this.backgroundColor.a / 255,
		);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	}
}

export type GLBuffers = {
	positions: { buf: WebGLBuffer; size: number };
	colors: { buf: WebGLBuffer; size: number };
};

export function debugColorArray(colors: Float32Array) {
	const colorsArr = [];
	for (let i = 0; i < colors.length; i += 4) {
		colorsArr.push({
			r: colors[i],
			g: colors[i + 1],
			b: colors[i + 2],
			a: colors[i + 3],
		});
	}
	return { colors: colorsArr };
}

export function debugPositionsArray(positions: Float32Array) {
	const positionsArr = [];
	for (let i = 0; i < positions.length; i += 2) {
		positionsArr.push({
			x: positions[i],
			y: positions[i + 1],
		});
	}
	return { positions: positionsArr };
}
