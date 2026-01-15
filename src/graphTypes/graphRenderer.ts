import { logError, logVerbose } from "#logger";
import type { ClickingState } from "../graphManager";

export interface Color {
	r: number;
	g: number;
	b: number;
	a?: number;
}

type PointerEventHandler = (e: PointerEvent) => void;

export type Positioning =
	| {
			top?: number;
			left?: number;
			right?: number;
			bottom?: number;
	  }
	| number;

export interface GraphRendererOptions {
	backgroundColor?: Color;
	positioning?: Positioning;
}

export interface WasmGraphRendererInterop<TGraph> {
	wasmGraph: TGraph;

	getPixelsPtr(): number;
	resize(width: number, height: number): void;
	update(
		timestamp: number,
		pointer: PointerType,
		clickingState: ClickingState,
	): void;
	render(): void;
	updateData(data: GraphData, timestamp: number): void;
	getIsAnimating(): boolean;
}

export type PointerType = {
	x: number;
	y: number;
	clickingState: ClickingState;
};

type InputEventType = {
	type: "pointerdown" | "pointermove" | "pointerup" | "pointerout";
	handler: PointerEventHandler;
	canvas: HTMLCanvasElement;
};

export const devicePixelRatio = window.devicePixelRatio || 1;
export class GraphRenderer<
	T,
	WasmInterop extends WasmGraphRendererInterop<T>,
	TOptions extends GraphRendererOptions,
> {
	protected canvas: HTMLCanvasElement;
	protected ctx: CanvasRenderingContext2D;
	protected width: number;
	protected height: number;

	protected options: TOptions;

	protected wasmMemory!: WebAssembly.Memory;
	protected pixelsArr!: Uint8ClampedArray;
	protected imageData: ImageData;

	protected wasmGraphRenderer!: WasmInterop;

	public pointer: PointerType;

	private hasInitialized = false;

	private pixelBufferSize = 0;

	private inputEventHandlers: {
		pointerdown?: PointerEventHandler;
		pointermove?: PointerEventHandler;
		pointerup?: PointerEventHandler;
		pointerout?: PointerEventHandler;
	} = {};

	addInputEventHandler(params: InputEventType) {
		this.inputEventHandlers[params.type] = params.handler;
		this.canvas.addEventListener(params.type, params.handler);
	}

	removeInputEventHandlers() {
		for (const [_key, value] of Object.entries(this.inputEventHandlers)) {
			const key = _key as keyof typeof this.inputEventHandlers;
			const e = { type: key, handler: value } as InputEventType;
			this.canvas.removeEventListener(e.type, e.handler);
		}

		this.inputEventHandlers = {};
	}

	constructor(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
		options: TOptions,
	) {
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed getting canvas rendering context");
		}

		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		canvas.width = width * devicePixelRatio;
		canvas.height = height * devicePixelRatio;
		ctx.scale(devicePixelRatio, devicePixelRatio);
		this.canvas = canvas;
		this.ctx = ctx;
		this.width = canvas.width;
		this.height = canvas.height;
		logVerbose({
			devicePixelRatio,
			canvas_width: canvas.width,
			canvas_height: canvas.height,
			this_width: this.width,
			this_height: this.height,
		});
		this.pixelBufferSize = this.width * this.height * 4;
		this.imageData = new ImageData(this.width, this.height);
		this.pointer = { x: -1, y: -1, clickingState: "None" };
		this.options = options;
	}

	protected _init(memory: WebAssembly.Memory, wasmGraphRenderer: WasmInterop) {
		if (this.hasInitialized) {
			logError("Renderer has already been initialized");
			return;
		}
		this.hasInitialized = true;
		this.wasmMemory = memory;
		this.wasmGraphRenderer = wasmGraphRenderer;
	}

	protected render() {
		this.wasmGraphRenderer.render();

		const pointer = this.wasmGraphRenderer.getPixelsPtr();
		if (pointer + this.pixelBufferSize <= this.wasmMemory.buffer.byteLength) {
			this.pixelsArr = new Uint8ClampedArray(
				this.wasmMemory.buffer,
				pointer,
				this.pixelBufferSize,
			);
			this.imageData.data.set(this.pixelsArr);
		} else {
			logError("Pointer+Size was outsize the bounds of the pixel buffer", {
				pointer,
				bufferSize: this.pixelBufferSize,
				memorySize: this.wasmMemory.buffer.byteLength,
			});
		}
		this.ctx.putImageData(this.imageData, 0, 0);
	}

	public resize(width: number, height: number) {
		if (width <= 0 || height <= 0) {
			logError("Cannot set canvas dimensions to non-positive value", {
				width,
				height,
			});
			return;
		}
		this.canvas.width = width * devicePixelRatio;
		this.canvas.height = height * devicePixelRatio;
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.ctx.scale(devicePixelRatio, devicePixelRatio);
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.pixelBufferSize = this.width * this.height * 4;
		this.wasmGraphRenderer.resize(this.canvas.width, this.canvas.height);
		this.imageData = new ImageData(this.width, this.height);
	}

	public getCanvas() {
		return this.canvas;
	}

	public getOptions() {
		return this.options;
	}
}

export type GraphData = object;

export interface IGraphRenderer {
	init(memory: WebAssembly.Memory, timestamp: number): void;
	update(timestamp: number): void;
	render(): void;
	updateData(data: GraphData, timestamp: number): void;
	isAnimating(): boolean;
	dispose(): void;
	removeInputEventHandlers(): void;
}
