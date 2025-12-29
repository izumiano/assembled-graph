import type { ClickingState } from "../graphManager";

export interface Color {
	r: number;
	g: number;
	b: number;
	a?: number;
}

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
		this.imageData = new ImageData(this.width, this.height);
		this.pointer = { x: -1, y: -1, clickingState: "None" };
	}

	protected _init(memory: WebAssembly.Memory, wasmGraphRenderer: WasmInterop) {
		this.wasmMemory = memory;

		this.pixelsArr = new Uint8ClampedArray(
			this.wasmMemory.buffer,
			wasmGraphRenderer.getPixelsPtr(),
			this.width * this.height * 4,
		);
		this.wasmGraphRenderer = wasmGraphRenderer;
	}

	public resize(width: number, height: number) {
		this.canvas.width = width * devicePixelRatio;
		this.canvas.height = height * devicePixelRatio;

		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.ctx.scale(devicePixelRatio, devicePixelRatio);

		this.width = this.canvas.width;
		this.height = this.canvas.height;

		this.wasmGraphRenderer.resize(this.canvas.width, this.canvas.height);
		const pixelsPointer = this.wasmGraphRenderer.getPixelsPtr();
		this.pixelsArr = new Uint8ClampedArray(
			this.wasmMemory.buffer,
			pixelsPointer,
			this.width * this.height * 4,
		);
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
}
