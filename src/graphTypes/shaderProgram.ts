import { logError } from "@izumiano/vite-logger";

export interface RequiredUniformLocations {
	projectionMatrix: WebGLUniformLocation;
	modelViewMatrix: WebGLUniformLocation;
}

export type WebGLBuffers = {
	[key: string]: WebGLBufferInfo;
};

export interface WebGLBufferInfo {
	buf: WebGLBuffer;
	size: number;
}

export interface IShaderProgram {
	initBuffers(gl: WebGL2RenderingContext): WebGLBuffers;
	setAttributes(gl: WebGL2RenderingContext): void;
	draw(
		timestamp: number,
		projectionMatrix: number[],
		modelViewMatrix: number[],
	): void;
}

export default class ShaderProgram<
	TAttribLocations,
	TUniformLocations extends RequiredUniformLocations,
	TBuffers extends WebGLBuffers,
	TOptions,
> {
	protected gl: WebGL2RenderingContext;
	protected buffers: TBuffers;

	protected options: TOptions & { maxVertices: number };

	protected program: WebGLProgram;
	protected attribLocations: TAttribLocations;
	protected uniformLocations: TUniformLocations;

	protected wasmMemory!: WebAssembly.Memory;

	constructor(
		gl: WebGL2RenderingContext,
		vsSource: string,
		fsSource: string,
		attribs: (keyof TAttribLocations)[],
		uniforms: (keyof TUniformLocations)[],
		options: TOptions & { maxVertices: number },
	) {
		this.gl = gl;
		this.options = options;

		const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
		const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

		if (!vertexShader) {
			throw new Error(
				`failed loading vertex shader\n--vsSource--:\n${vsSource}`,
			);
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

		this.attribLocations = attribs.reduce((prev, attrib) => {
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

		this.uniformLocations = uniforms.reduce((prev, uniform) => {
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

		this.program = shaderProgram;

		this.buffers = this.initBuffers(gl);
	}

	public init(memory: WebAssembly.Memory) {
		this.wasmMemory = memory;
	}

	public initBuffers(_gl: WebGL2RenderingContext): TBuffers {
		throw new Error(
			"Everything inheriting from WebGLProgram should implement it's own initBuffers function",
		);
	}

	public wasmArrayToFloat32Array(arr: { pointer: number; size: number }) {
		return new Float32Array(this.wasmMemory.buffer, arr.pointer, arr.size);
	}

	protected setAttributes(_gl: WebGL2RenderingContext) {
		throw new Error(
			"Everything inheriting from WebGLProgram should implement it's own setAttributes function",
		);
	}

	public draw(
		_timestamp: number,
		projectionMatrix: number[],
		modelViewMatrix: number[],
		vertexCount: number,
	) {
		if (
			import.meta.env.MODE === "development" ||
			import.meta.env.VITE_TRACE === "true"
		) {
			if (vertexCount > this.options.maxVertices) {
				logError(
					`Vertex count (${vertexCount}) is greater than maxVertices (${this.options.maxVertices})`,
				);
				return;
			}
		}

		const gl = this.gl;
		gl.useProgram(this.program);
		this.setAttributes(gl);

		gl.uniformMatrix4fv(
			this.uniformLocations.projectionMatrix,
			false,
			projectionMatrix,
		);
		gl.uniformMatrix4fv(
			this.uniformLocations.modelViewMatrix,
			false,
			modelViewMatrix,
		);
	}
}

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
