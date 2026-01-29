import { trace } from "@izumiano/vite-logger";
import type { WasmFloat32Array } from "../../graph-renderer/pkg/graph_renderer";
import type { IShaderProgram, WebGLBufferInfo } from "../shaderProgram";
import ShaderProgram from "../shaderProgram";

import fsSource from "./bars.frag";
import vsSource from "./bars.vert";

const VERTICES_PER_BAR = 6;

type AttribLocations = {
	vertexPosition: number;
	vertexColor: number;
	vertexRelativeBarPosition: number;
};

type UniformLocations = {
	projectionMatrix: WebGLUniformLocation;
	modelViewMatrix: WebGLUniformLocation;
	cornerRadius: WebGLUniformLocation;
};

type Buffers = {
	positions: WebGLBufferInfo;
	colors: WebGLBufferInfo;
	relativeBarPositions: WebGLBufferInfo;
};

export default class BarsProgram
	extends ShaderProgram<
		AttribLocations,
		UniformLocations,
		Buffers,
		{ maxBars: number }
	>
	implements IShaderProgram
{
	public cornerRadius: number = 0;

	constructor(gl: WebGL2RenderingContext, options: { maxBars: number }) {
		super(
			gl,
			vsSource,
			fsSource,
			["vertexColor", "vertexPosition", "vertexRelativeBarPosition"],
			["modelViewMatrix", "projectionMatrix", "cornerRadius"],
			options,
		);
	}

	initBuffers(gl: WebGL2RenderingContext): Buffers {
		const positionsBuffer_bars = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer_bars);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(this.options.maxBars * VERTICES_PER_BAR * 2),
			gl.DYNAMIC_DRAW,
		);

		const colorsBuffer_bars = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer_bars);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(this.options.maxBars * VERTICES_PER_BAR * 4),
			gl.DYNAMIC_DRAW,
		);

		const relativeBarHeightsBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, relativeBarHeightsBuffer);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(this.options.maxBars * VERTICES_PER_BAR * 4),
			gl.DYNAMIC_DRAW,
		);

		return {
			positions: { buf: positionsBuffer_bars, size: 0 },
			colors: { buf: colorsBuffer_bars, size: 0 },
			relativeBarPositions: { buf: relativeBarHeightsBuffer, size: 0 },
		};
	}

	private updatePositionsBuffer(positions: WasmFloat32Array) {
		trace({ positions });
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.positions.buf);
		this.gl.bufferSubData(
			this.gl.ARRAY_BUFFER,
			0,
			this.wasmArrayToFloat32Array(positions),
		);
		this.buffers.positions.size = positions.size;
	}

	private updateColorsBuffer(colors: WasmFloat32Array) {
		trace({ colors });
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.colors.buf);
		this.gl.bufferSubData(
			this.gl.ARRAY_BUFFER,
			0,
			this.wasmArrayToFloat32Array(colors),
		);
		this.buffers.colors.size = colors.size;
	}

	private updateRelativeBarPositionsBuffer(heights: WasmFloat32Array) {
		trace({ heights });
		this.gl.bindBuffer(
			this.gl.ARRAY_BUFFER,
			this.buffers.relativeBarPositions.buf,
		);
		this.gl.bufferSubData(
			this.gl.ARRAY_BUFFER,
			0,
			this.wasmArrayToFloat32Array(heights),
		);
		this.buffers.relativeBarPositions.size = heights.size;
	}

	public updateBuffers(
		positions: WasmFloat32Array,
		colors: WasmFloat32Array,
		relativeBarPositions: WasmFloat32Array,
	) {
		trace();
		this.gl.useProgram(this.program);
		this.updatePositionsBuffer(positions);
		this.updateColorsBuffer(colors);
		this.updateRelativeBarPositionsBuffer(relativeBarPositions);
	}

	private setPositionAttribute(gl: WebGL2RenderingContext) {
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positions.buf);
		gl.vertexAttribPointer(
			this.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(this.attribLocations.vertexPosition);
	}

	private setColorAttribute(gl: WebGL2RenderingContext) {
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.colors.buf);
		gl.vertexAttribPointer(
			this.attribLocations.vertexColor,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(this.attribLocations.vertexColor);
	}

	private setRelativeBarHeightsAttribute(gl: WebGL2RenderingContext) {
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.relativeBarPositions.buf);
		gl.vertexAttribPointer(
			this.attribLocations.vertexRelativeBarPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(this.attribLocations.vertexRelativeBarPosition);
	}

	public setAttributes(gl: WebGL2RenderingContext) {
		this.setPositionAttribute(gl);
		this.setColorAttribute(gl);
		this.setRelativeBarHeightsAttribute(gl);
	}

	public draw(
		timestamp: number,
		projectionMatrix: number[],
		modelViewMatrix: number[],
	) {
		const gl = this.gl;

		super.draw(timestamp, projectionMatrix, modelViewMatrix);

		gl.uniform1f(this.uniformLocations.cornerRadius, this.cornerRadius);

		const offset = 0;
		const vertexCount = this.buffers.positions.size / 2;
		gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
	}
}
