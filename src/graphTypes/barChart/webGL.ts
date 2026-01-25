import { trace } from "@izumiano/vite-logger";
import WebGLRenderer, {
	initShaderProgram,
	type GLProgramInfo,
	type IWebGL,
	type WebGLBufferInfo,
} from "../webGL";
import type { Color } from "../graphRenderer";

import fsSource_general from "./general.frag";
import vsSource_general from "./general.vert";
import fsSource_bars from "./bars.frag";
import vsSource_bars from "./bars.vert";
import { mat4 } from "gl-matrix";

const PREALLOCATED_BAR_VERTEX_ARRAY = 12 * 1000;

type BarChartAttribLocations_General = {
	vertexPosition: number;
	vertexColor: number;
};

type BarChartUniformLocations_General = {
	projectionMatrix: WebGLUniformLocation;
	modelViewMatrix: WebGLUniformLocation;
};

type BarChartAttribLocations_Bars = {
	vertexPosition: number;
	vertexColor: number;
	vertexRelativeBarPosition: number;
};

type BarChartUniformLocations_Bars = {
	projectionMatrix: WebGLUniformLocation;
	modelViewMatrix: WebGLUniformLocation;
	cornerRadius: WebGLUniformLocation;
};

type BarChartBuffers = {
	positions_general: WebGLBufferInfo;
	colors_general: WebGLBufferInfo;

	positions_bars: WebGLBufferInfo;
	colors_bars: WebGLBufferInfo;
	relativeBarPositions: WebGLBufferInfo;
};

export default class BarChartGL
	extends WebGLRenderer<BarChartBuffers>
	implements IWebGL<BarChartBuffers>
{
	public cornerRadius: number = 0;

	private programInfo_general: GLProgramInfo<
		BarChartAttribLocations_General,
		BarChartUniformLocations_General
	>;
	private programInfo_bars: GLProgramInfo<
		BarChartAttribLocations_Bars,
		BarChartUniformLocations_Bars
	>;

	constructor(canvas: HTMLCanvasElement, backgroundColor: Color) {
		super({
			canvas,
			backgroundColor,
		});

		this.programInfo_general = initShaderProgram(
			this.gl,
			vsSource_general,
			fsSource_general,
			["vertexColor", "vertexPosition"],
			["projectionMatrix", "modelViewMatrix"],
		);
		this.programInfo_bars = initShaderProgram(
			this.gl,
			vsSource_bars,
			fsSource_bars,
			["vertexColor", "vertexPosition", "vertexRelativeBarPosition"],
			["projectionMatrix", "modelViewMatrix", "cornerRadius"],
		);
	}

	override initBuffers(gl: WebGL2RenderingContext) {
		const positionsBuffer_general = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer_general);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(PREALLOCATED_BAR_VERTEX_ARRAY),
			gl.DYNAMIC_DRAW,
		);

		const colorsBuffer_general = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer_general);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(PREALLOCATED_BAR_VERTEX_ARRAY * 4),
			gl.DYNAMIC_DRAW,
		);

		const positionsBuffer_bars = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer_bars);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(PREALLOCATED_BAR_VERTEX_ARRAY),
			gl.DYNAMIC_DRAW,
		);

		const colorsBuffer_bars = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, colorsBuffer_bars);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(PREALLOCATED_BAR_VERTEX_ARRAY * 4),
			gl.DYNAMIC_DRAW,
		);

		const relativeBarHeightsBuffer = gl.createBuffer();

		gl.bindBuffer(gl.ARRAY_BUFFER, relativeBarHeightsBuffer);

		gl.bufferData(
			gl.ARRAY_BUFFER,
			new Float32Array(PREALLOCATED_BAR_VERTEX_ARRAY * 4),
			gl.DYNAMIC_DRAW,
		);

		return {
			positions_general: { buf: positionsBuffer_general, size: 0 },
			colors_general: { buf: colorsBuffer_general, size: 0 },
			positions_bars: { buf: positionsBuffer_bars, size: 0 },
			colors_bars: { buf: colorsBuffer_bars, size: 0 },
			relativeBarPositions: { buf: relativeBarHeightsBuffer, size: 0 },
		};
	}

	private setAttributes_general(gl: WebGL2RenderingContext) {
		this.setPositionAttribute_general(gl);
		this.setColorAttribute_general(gl);
	}

	private setAttributes_bars(gl: WebGL2RenderingContext) {
		this.setPositionAttribute_bars(gl);
		this.setColorAttribute_bars(gl);
		this.setRelativeBarHeightsAttribute(gl);
	}

	private setPositionAttribute_general(gl: WebGL2RenderingContext) {
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positions_general.buf);
		gl.vertexAttribPointer(
			this.programInfo_general.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(
			this.programInfo_general.attribLocations.vertexPosition,
		);
	}

	private setColorAttribute_general(gl: WebGL2RenderingContext) {
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.colors_general.buf);
		gl.vertexAttribPointer(
			this.programInfo_general.attribLocations.vertexColor,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(
			this.programInfo_general.attribLocations.vertexColor,
		);
	}

	private setPositionAttribute_bars(gl: WebGL2RenderingContext) {
		const numComponents = 2;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.positions_bars.buf);
		gl.vertexAttribPointer(
			this.programInfo_bars.attribLocations.vertexPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(
			this.programInfo_bars.attribLocations.vertexPosition,
		);
	}

	private setColorAttribute_bars(gl: WebGL2RenderingContext) {
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.colors_bars.buf);
		gl.vertexAttribPointer(
			this.programInfo_bars.attribLocations.vertexColor,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(
			this.programInfo_bars.attribLocations.vertexColor,
		);
	}

	private setRelativeBarHeightsAttribute(gl: WebGL2RenderingContext) {
		const numComponents = 4;
		const type = gl.FLOAT;
		const normalize = false;
		const stride = 0;
		const offset = 0;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.relativeBarPositions.buf);
		gl.vertexAttribPointer(
			this.programInfo_bars.attribLocations.vertexRelativeBarPosition,
			numComponents,
			type,
			normalize,
			stride,
			offset,
		);
		gl.enableVertexAttribArray(
			this.programInfo_bars.attribLocations.vertexRelativeBarPosition,
		);
	}

	private updatePositionsBuffer_general(positions: Float32Array) {
		trace({ positions });
		this.gl.bindBuffer(
			this.gl.ARRAY_BUFFER,
			this.buffers.positions_general.buf,
		);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, positions);
		this.buffers.positions_general.size = positions.length;
	}

	private updateColorsBuffer_general(colors: Float32Array) {
		trace({ colors });
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.colors_general.buf);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, colors);
		this.buffers.colors_general.size = colors.length;
	}

	public updateGeneralBuffers(positions: Float32Array, colors: Float32Array) {
		trace();
		this.gl.useProgram(this.programInfo_general.program);
		this.updatePositionsBuffer_general(positions);
		this.updateColorsBuffer_general(colors);
	}

	public updatePositionsBuffer_bars(positions: Float32Array) {
		trace({ positions });
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.positions_bars.buf);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, positions);
		this.buffers.positions_bars.size = positions.length;
	}

	public updateColorsBuffer_bars(colors: Float32Array) {
		trace({ colors });
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffers.colors_bars.buf);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, colors);
		this.buffers.colors_bars.size = colors.length;
	}

	public updateRelativeBarPositionsBuffer(heights: Float32Array) {
		trace({ heights });
		this.gl.bindBuffer(
			this.gl.ARRAY_BUFFER,
			this.buffers.relativeBarPositions.buf,
		);
		this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, heights);
		this.buffers.relativeBarPositions.size = heights.length;
	}

	public updateBarsBuffers(
		positions: Float32Array,
		colors: Float32Array,
		relativeBarPositions: Float32Array,
	) {
		trace();
		this.gl.useProgram(this.programInfo_bars.program);
		this.updatePositionsBuffer_bars(positions);
		this.updateColorsBuffer_bars(colors);
		this.updateRelativeBarPositionsBuffer(relativeBarPositions);
	}

	override draw(timestamp: number) {
		trace();
		super.draw(timestamp);

		const gl = this.gl;

		const projectionMatrix = mat4.create();

		const modelViewMatrix = mat4.create();

		gl.useProgram(this.programInfo_general.program);
		this.setAttributes_general(gl);

		gl.uniformMatrix4fv(
			this.programInfo_general.uniformLocations.projectionMatrix,
			false,
			Array.from(projectionMatrix),
		);
		gl.uniformMatrix4fv(
			this.programInfo_general.uniformLocations.modelViewMatrix,
			false,
			Array.from(modelViewMatrix),
		);
		{
			const offset = 0;
			const vertexCount = this.buffers.positions_general.size / 2;
			gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
		}

		//

		gl.useProgram(this.programInfo_bars.program);
		this.setAttributes_bars(gl);

		gl.uniformMatrix4fv(
			this.programInfo_bars.uniformLocations.projectionMatrix,
			false,
			Array.from(projectionMatrix),
		);
		gl.uniformMatrix4fv(
			this.programInfo_bars.uniformLocations.modelViewMatrix,
			false,
			Array.from(modelViewMatrix),
		);
		gl.uniform1f(
			this.programInfo_bars.uniformLocations.cornerRadius,
			this.cornerRadius,
		);
		{
			const offset = 0;
			const vertexCount = this.buffers.positions_bars.size / 2;
			gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
		}
	}
}
