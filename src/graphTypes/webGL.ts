import { mat4 } from "gl-matrix";
import type { Color } from "./graphRenderer";
import { logError, trace } from "@izumiano/vite-logger";

export type WebGLBuffers = {
	[key: string]: { buf: WebGLBuffer; size: number };
};

export interface WebGLBufferInfo {
	buf: WebGLBuffer;
	size: number;
}

export interface RequiredUniformLocations {
	projectionMatrix: WebGLUniformLocation;
	modelViewMatrix: WebGLUniformLocation;
}

export interface IWebGL<TBuffers extends WebGLBuffers> {
	initBuffers(gl: WebGL2RenderingContext): TBuffers;
	setAttributes(gl: WebGL2RenderingContext): void;
}

export default class WebGLRenderer<
	TAttribLocations,
	TUniformLocations extends RequiredUniformLocations,
	TBuffers extends WebGLBuffers,
> {
	public gl: WebGL2RenderingContext;
	protected programInfo: GLProgramInfo<TAttribLocations, TUniformLocations>;

	protected buffers: TBuffers;

	private backgroundColor: Required<Color>;

	constructor({
		canvas,
		backgroundColor,
		vsSource,
		fsSource,
		attribs,
		uniforms,
	}: {
		canvas: HTMLCanvasElement;
		backgroundColor: Color;
		vsSource: string;
		fsSource: string;
		attribs: (keyof TAttribLocations)[];
		uniforms: (keyof TUniformLocations)[];
	}) {
		trace();
		const gl = canvas.getContext("webgl2");

		if (!gl) {
			throw new Error("Failed getting canvas rendering context");
		}

		const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

		if (!shaderProgram) {
			throw new Error("failed initializing shader program");
		}

		const attribLocations = attribs.reduce((prev, attrib) => {
			const str = attrib.toString();
			const varName = `a${str[0].toUpperCase()}${str.slice(1)}`;
			const location = gl.getAttribLocation(shaderProgram, varName);
			if (location == null || location < 0) {
				throw new Error(`Failed getting location for '${varName}'`);
			}
			return {
				// biome-ignore lint/performance/noAccumulatingSpread: <this isn't run often>
				...prev,
				[attrib]: location,
			};
		}, {} as TAttribLocations);

		const uniformLocations = uniforms.reduce((prev, uniform) => {
			const str = uniform.toString();
			const varName = `u${str[0].toUpperCase()}${str.slice(1)}`;
			const location = gl.getUniformLocation(shaderProgram, varName);
			if (location == null || Number(location) < 0) {
				throw new Error(`Failed getting location for '${varName}'`);
			}
			return {
				// biome-ignore lint/performance/noAccumulatingSpread: <this isn't run often>
				...prev,
				[uniform]: location,
			};
		}, {} as TUniformLocations);

		const programInfo: GLProgramInfo<TAttribLocations, TUniformLocations> = {
			program: shaderProgram,
			attribLocations,
			uniformLocations,
		};

		const buffers = this.initBuffers(gl);

		this.gl = gl;
		this.programInfo = programInfo;
		this.buffers = buffers;
		this.backgroundColor = { ...backgroundColor, a: backgroundColor.a ?? 255 };
	}

	protected initBuffers(_gl: WebGL2RenderingContext): TBuffers {
		throw new Error(
			"Everything inheriting from webGL should implement it's own initBuffers function",
		);
	}

	protected setAttributes(_gl: WebGL2RenderingContext) {
		throw new Error(
			"Everything inheriting from webGL should implement it's own setAttributes function",
		);
	}

	public draw(_timestamp: number) {
		trace();
		const gl = this.gl;

		gl.clearColor(
			this.backgroundColor.r / 255,
			this.backgroundColor.g / 255,
			this.backgroundColor.b / 255,
			this.backgroundColor.a / 255,
		);

		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		const projectionMatrix = mat4.create();

		const modelViewMatrix = mat4.create();

		this.setAttributes(gl);

		gl.useProgram(this.programInfo.program);

		gl.uniformMatrix4fv(
			this.programInfo.uniformLocations.projectionMatrix,
			false,
			Array.from(projectionMatrix),
		);
		gl.uniformMatrix4fv(
			this.programInfo.uniformLocations.modelViewMatrix,
			false,
			Array.from(modelViewMatrix),
		);
		{
			const offset = 0;
			const vertexCount = this.buffers.positions.size / 2;
			gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
		}
	}
}

export type GLProgramInfo<TAttribLocations, TUniformLocations> = {
	program: WebGLProgram;
	attribLocations: TAttribLocations;
	uniformLocations: TUniformLocations;
};

export type GLBuffers = {
	positions: { buf: WebGLBuffer; size: number };
	colors: { buf: WebGLBuffer; size: number };
};

function loadShader(gl: WebGL2RenderingContext, type: GLenum, source: string) {
	const shader = gl.createShader(type);
	if (!shader) {
		logError("Failed creating shader");
		return;
	}

	gl.shaderSource(shader, source);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		logError(gl.getShaderInfoLog(shader));
		gl.deleteShader(shader);
		return;
	}

	return shader;
}

function initShaderProgram(
	gl: WebGL2RenderingContext,
	vsSource: string,
	fsSource: string,
) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	if (!vertexShader) {
		logError("failed loading vertex shader", { vsSource });
		return;
	}

	if (!fragmentShader) {
		logError("failed loading fragment shader", { fsSource });
		return;
	}

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		logError(gl.getProgramInfoLog(shaderProgram));
		return;
	}

	return shaderProgram;
}
