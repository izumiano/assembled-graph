import { trace } from "@izumiano/vite-logger";
import WebGLRenderer, { type IWebGL, type WebGLBufferInfo } from "../webGL";
import type { Color } from "../graphRenderer";

import fsSource from "./barChart.frag?raw";
import vsSource from "./barChart.vert?raw";

const PREALLOCATED_BAR_VERTEX_ARRAY = 12 * 1000;

export type BarChartAttribLocations = {
	vertexPosition: number;
	vertexColor: number;
};

export type BarChartUniformLocations = {
	projectionMatrix: WebGLUniformLocation;
	modelViewMatrix: WebGLUniformLocation;
};

export type BarChartBuffers = {
	positions: WebGLBufferInfo;
	colors: WebGLBufferInfo;
};

export default class BarChartGL
	extends WebGLRenderer<
		BarChartAttribLocations,
		BarChartUniformLocations,
		BarChartBuffers
	>
	implements IWebGL<BarChartBuffers>
{
	constructor(canvas: HTMLCanvasElement, backgroundColor: Color) {
		super({
			canvas,
			backgroundColor,
			fsSource,
			vsSource,
			attribs: ["vertexColor", "vertexPosition"],
			uniforms: ["projectionMatrix", "modelViewMatrix"],
		});
	}

	override initBuffers(gl: WebGL2RenderingContext) {
		const positionsBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(PREALLOCATED_BAR_VERTEX_ARRAY),
			gl.DYNAMIC_DRAW,
		);

		const colorsBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(PREALLOCATED_BAR_VERTEX_ARRAY * 4),
			gl.DYNAMIC_DRAW,
		);

		return {
			positions: { buf: positionsBuffer, size: 0 },
			colors: { buf: colorsBuffer, size: 0 },
		};
	}

	override setAttributes(gl: WebGL2RenderingContext) {
		this.setPositionAttribute(gl);
		this.setColorAttribute(gl);
	}

	private setPositionAttribute(gl: WebGL2RenderingContext) {
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positions.buf);
		gl.vertexAttribPointer(
			this.programInfo.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexPosition);
	}

	private setColorAttribute(gl: WebGL2RenderingContext) {
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.colors.buf);
		gl.vertexAttribPointer(
			this.programInfo.attribLocations.vertexColor,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(this.programInfo.attribLocations.vertexColor);
	}

	public updatePositionsBuffer(positions: Float32Array) {
		trace({ positions });
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.positions.buf);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, positions);
		this.buffers.positions.size = positions.length;
	}

	public updateColorsBuffer(colors: Float32Array) {
		trace({ colors });
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.colors.buf);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, colors);
		this.buffers.colors.size = colors.length;
	}
}
