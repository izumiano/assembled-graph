import type { Color } from "./graphRenderer";
import { logError, trace } from "@izumiano/vite-logger";

export type WebGLBuffers = {
	[key: string]: WebGLBufferInfo;
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
	draw(timestamp: number): void;
}

export default class WebGLRenderer<TBuffers extends WebGLBuffers, TOptions> {
	public gl: WebGL2RenderingContext;

	protected buffers: TBuffers;
	protected options: TOptions;

	private backgroundColor: Required<Color>;

	constructor({
		canvas,
		backgroundColor,
		options,
	}: {
		canvas: HTMLCanvasElement;
		backgroundColor: Color;
		options: TOptions;
	}) {
		trace();
		this.options = options;

		const gl = canvas.getContext("webgl2");

		if (!gl) {
			throw new Error("Failed getting canvas rendering context");
		}

		const buffers = this.initBuffers(gl);

		this.gl = gl;
		this.buffers = buffers;
		this.backgroundColor = { ...backgroundColor, a: backgroundColor.a ?? 255 };
	}

	protected initBuffers(_gl: WebGL2RenderingContext): TBuffers {
		throw new Error(
			"Everything inheriting from WebGLRenderer should implement it's own initBuffers function",
		);
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

export function initShaderProgram<
	TAttribLocations,
	TUniformLocations extends RequiredUniformLocations,
>(
	gl: WebGL2RenderingContext,
	vsSource: string,
	fsSource: string,
	attribs: (keyof TAttribLocations)[],
	uniforms: (keyof TUniformLocations)[],
) {
	const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
	const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

	if (!vertexShader) {
		throw new Error(`failed loading vertex shader\n--vsSource--:\n${vsSource}`);
	}

	if (!fragmentShader) {
		throw new Error(
			`failed loading fragment shader\n--fsSource--:\n${fsSource}`,
		);
	}

	const shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		throw new Error(
			`Failed linking shader program with error: [${gl.getProgramInfoLog(shaderProgram)}]`,
		);
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

	return programInfo;
}

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
