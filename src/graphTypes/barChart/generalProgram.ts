import { trace } from "@izumiano/vite-logger";
import type { WasmFloat32Array } from "../../graph-renderer/pkg/graph_renderer";
import type { IShaderProgram, WebGLBufferInfo } from "../shaderProgram";
import ShaderProgram from "../shaderProgram";

import fsSource from "./general.frag";
import vsSource from "./general.vert";

const MAX_GENERAL_VERTICES = 100 * 6;

type AttribLocations = {
	vertexPosition: number;
	vertexColor: number;
};

type UniformLocations = {
	projectionMatrix: WebGLUniformLocation;
	modelViewMatrix: WebGLUniformLocation;
};

type Buffers = {
	positions: WebGLBufferInfo;
	colors: WebGLBufferInfo;
};

export default class GeneralProgram
	extends ShaderProgram<AttribLocations, UniformLocations, Buffers, null>
	implements IShaderProgram
{
	constructor(gl: WebGL2RenderingContext) {
		super(
			gl,
			vsSource,
			fsSource,
			["vertexColor", "vertexPosition"],
			["modelViewMatrix", "projectionMatrix"],
			null,
		);
	}

	initBuffers(gl: WebGL2RenderingContext): Buffers {
		const positionsBuffer_general = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer_general);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(MAX_GENERAL_VERTICES * 2),
			gl.DYNAMIC_DRAW,
		);

		const colorsBuffer_general = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer_general);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(MAX_GENERAL_VERTICES * 4),
			gl.DYNAMIC_DRAW,
		);

		return {
			positions: { buf: positionsBuffer_general, size: 0 },
			colors: { buf: colorsBuffer_general, size: 0 },
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

	public updateBuffers(positions: WasmFloat32Array, colors: WasmFloat32Array) {
		trace();
		this.gl.useProgram(this.program);
		this.updatePositionsBuffer(positions);
		this.updateColorsBuffer(colors);
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

	override setAttributes(gl: WebGL2RenderingContext) {
		this.setPositionAttribute(gl);
		this.setColorAttribute(gl);
	}

	public draw(
		timestamp: number,
		projectionMatrix: number[],
		modelViewMatrix: number[],
	) {
		super.draw(timestamp, projectionMatrix, modelViewMatrix);

		const offset = 0;
		const vertexCount = this.buffers.positions.size / 2;
		this.gl.drawArrays(this.gl.TRIANGLES, offset, vertexCount);
	}
}
