import { mat4 } from "gl-matrix";
import { logError } from "#logger";
import type { Color } from "./graphTypes/graphRenderer";

const PREALLOCATED_BAR_VERTEX_ARRAY = 12 * 1000;

export type GLProgramInfo = {
	program: WebGLProgram;
	attribLocations: {
		vertexPosition: number;
	};
	uniformLocations: {
		projectionMatrix: WebGLUniformLocation | null;
		modelViewMatrix: WebGLUniformLocation | null;
	};
};

export type GLBuffers = {
	positions: { buf: WebGLBuffer; size: number };
};

export function webGLInit(
	canvas: HTMLCanvasElement,
	vsSource: string,
	fsSource: string,
) {
	const gl = canvas.getContext("webgl2");

	if (!gl) {
		throw new Error("Failed getting canvas rendering context");
	}

	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

	if (!shaderProgram) {
		logError("failed initializing shader program");
		return;
	}

	const programInfo: GLProgramInfo = {
		program: shaderProgram,
		attribLocations: {
			vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
		},
		uniformLocations: {
			projectionMatrix: gl.getUniformLocation(
				shaderProgram,
				"uProjectionMatrix",
			),
			modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
		},
	};

	const buffers = initBuffers(gl);

	return {
		gl,
		programInfo,
		buffers,
	};
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

function initBuffers(gl: WebGL2RenderingContext) {
	const positionsBuffer = gl.createBuffer();

	gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);

	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array(PREALLOCATED_BAR_VERTEX_ARRAY),
		gl.DYNAMIC_DRAW,
	);

	return {
		positions: { buf: positionsBuffer, size: 0 },
	};
}

export function updatePositionsBuffer(
	gl: WebGL2RenderingContext,
	positions: Float32Array,
	positionsBuffer: { buf: WebGLBuffer; size: number },
) {
	gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer.buf);
	gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
	positionsBuffer.size = positions.length;
}

export function drawScene(
	gl: WebGL2RenderingContext,
	programInfo: GLProgramInfo,
	buffers: GLBuffers,
	backgroundColor: Color,
	_timestamp: number,
) {
	gl.clearColor(
		backgroundColor.r / 255,
		backgroundColor.g / 255,
		backgroundColor.b / 255,
		(backgroundColor.a ?? 255) / 255,
	);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	const projectionMatrix = mat4.create();

	const modelViewMatrix = mat4.create();

	// mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -timestamp / 1000]);
	// mat4.rotate(modelViewMatrix, modelViewMatrix, timestamp / 100, [0, 0, 1]);

	setPositionAttribute(gl, buffers, programInfo);

	gl.useProgram(programInfo.program);

	gl.uniformMatrix4fv(
		programInfo.uniformLocations.projectionMatrix,
		false,
		Array.from(projectionMatrix),
	);
	gl.uniformMatrix4fv(
		programInfo.uniformLocations.modelViewMatrix,
		false,
		Array.from(modelViewMatrix),
	);

	{
		const offset = 0;
		const vertexCount = buffers.positions.size / 2;
		gl.drawArrays(gl.TRIANGLES, offset, vertexCount);
	}
}

function setPositionAttribute(
	gl: WebGL2RenderingContext,
	buffers: GLBuffers,
	programInfo: GLProgramInfo,
) {
	const numComponents = 2;
	const type = gl.FLOAT;
	const normalize = false;
	const stride = 0;
	const offset = 0;

	gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positions.buf);
	gl.vertexAttribPointer(
		programInfo.attribLocations.vertexPosition,
		numComponents,
		type,
		normalize,
		stride,
		offset,
	);
	gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
}
