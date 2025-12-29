import type { ClickingState } from "../graphManager";

interface Color {
	r: number;
	g: number;
	b: number;
	a?: number;
}

type MouseEventHandler = (e: MouseEvent) => void;
type TouchEventHandler = (e: TouchEvent) => void;

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
	getIsAnimating(): boolean;
}

export type PointerType = {
	x: number;
	y: number;
	clickingState: ClickingState;
};

type MouseEventType = {
	type: "mousedown" | "mousemove" | "mouseup" | "mouseleave";
	handler: MouseEventHandler;
};

type TouchEventType = {
	type: "touchstart" | "touchmove" | "touchcancel" | "touchend";
	handler: TouchEventHandler;
};

type InputEventType = (MouseEventType | TouchEventType) & {
	canvas: HTMLCanvasElement;
};

function isMouseEvent(e: MouseEventType | TouchEventType): e is MouseEventType {
	return e.type.startsWith("mouse");
}

export const devicePixelRatio = window.devicePixelRatio || 1;
export class GraphRenderer<T, WasmInterop extends WasmGraphRendererInterop<T>> {
	protected canvas: HTMLCanvasElement;
	protected ctx: CanvasRenderingContext2D;
	protected width: number;
	protected height: number;

	protected wasmMemory!: WebAssembly.Memory;
	protected pixelsArr!: Uint8ClampedArray;
	protected imageData: ImageData;

	protected wasmGraphRenderer!: WasmInterop;

	public pointer: PointerType;

	private hasInitialized = false;

	private pixelBufferSize = 0;

	private inputEventHandlers: {
		mousedown?: MouseEventHandler;
		mousemove?: MouseEventHandler;
		mouseup?: MouseEventHandler;
		mouseleave?: MouseEventHandler;
		touchstart?: TouchEventHandler;
		touchmove?: TouchEventHandler;
		touchcancel?: TouchEventHandler;
		touchend?: TouchEventHandler;
	} = {};

	addInputEventHandler(params: InputEventType) {
		const e = params as MouseEventType | TouchEventType;
		if (isMouseEvent(e)) {
			this.inputEventHandlers[e.type] = e.handler;
			this.canvas.addEventListener(e.type, e.handler);
		} else {
			this.inputEventHandlers[e.type] = e.handler;
			this.canvas.addEventListener(e.type, e.handler);
		}
	}

	removeInputEventHandlers() {
		for (const [_key, value] of Object.entries(this.inputEventHandlers)) {
			const key = _key as keyof typeof this.inputEventHandlers;
			const e = { type: key, handler: value } as InputEventType;
			if (isMouseEvent(e)) {
				this.canvas.removeEventListener(e.type, e.handler);
			} else {
				this.canvas.removeEventListener(e.type, e.handler);
			}
		}

		this.inputEventHandlers = {};
	}

	constructor(canvas: HTMLCanvasElement) {
		const ctx = canvas.getContext("2d");

		if (!ctx) {
			throw new Error("Failed getting canvas rendering context");
		}

		canvas.style.width = `${canvas.width}px`;
		canvas.style.height = `${canvas.height}px`;
		canvas.width = canvas.width * devicePixelRatio;
		canvas.height = canvas.height * devicePixelRatio;
		ctx.scale(devicePixelRatio, devicePixelRatio);
		this.canvas = canvas;
		this.ctx = ctx;
		this.width = canvas.width;
		this.height = canvas.height;
		this.pixelBufferSize = this.width * this.height * 4;
		this.imageData = new ImageData(this.width, this.height);
		this.pointer = { x: -1, y: -1, clickingState: "None" };
	}

	protected _init(memory: WebAssembly.Memory, wasmGraphRenderer: WasmInterop) {
		if (this.hasInitialized) {
			console.error("Renderer has already been initialized");
			return;
		}
		this.hasInitialized = true;
		this.wasmMemory = memory;
		this.wasmGraphRenderer = wasmGraphRenderer;
	}

	protected baseRender() {
		this.wasmGraphRenderer.render();

		const pointer = this.wasmGraphRenderer.getPixelsPtr();
		if (pointer + this.pixelBufferSize <= this.wasmMemory.buffer.byteLength) {
			this.pixelsArr = new Uint8ClampedArray(
				this.wasmMemory.buffer,
				pointer,
				this.pixelBufferSize,
			);
			this.imageData.data.set(this.pixelsArr);
		}
		this.ctx.putImageData(this.imageData, 0, 0);
	}

	public resize(width: number, height: number) {
		this.canvas.width = width * devicePixelRatio;
		this.canvas.height = height * devicePixelRatio;

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.ctx.scale(devicePixelRatio, devicePixelRatio);

		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.pixelBufferSize = this.width * this.height * 4;

		this.wasmGraphRenderer.resize(this.canvas.width, this.canvas.height);
		// const pixelsPointer = this.wasmGraphRenderer.getPixelsPtr();
		// this.pixelsArr = new Uint8ClampedArray(
		// 	this.wasmMemory.buffer,
		// 	pixelsPointer,
		// 	this.width * this.height * 4,
		// );
		this.imageData = new ImageData(this.width, this.height);
	}

	public getCanvas() {
		return this.canvas;
	}
}

export interface IGraphRenderer {
	init(memory: WebAssembly.Memory, timestamp: number): void;
	update(timestamp: number): void;
	render(): void;
	isAnimating(): boolean;
	dispose(): void;
}
