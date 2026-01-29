import { logError, trace, traceWarn } from "@izumiano/vite-logger";
import type { ClickingState } from "../graphManager";
import type WebGLRenderer from "./webGLRenderer";
import type { IWebGLRenderer } from "./webGLRenderer";

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

export type UnknownGraphRenderer = GraphRenderer<
	unknown,
	WasmGraphRendererInterop<unknown>,
	GraphRendererOptions,
	WebGLRenderer,
	unknown
>;

export const devicePixelRatio = window.devicePixelRatio || 1;
export class GraphRenderer<
	T,
	WasmInterop extends WasmGraphRendererInterop<T>,
	TOptions extends GraphRendererOptions,
	TGLRenderer extends WebGLRenderer,
	TData,
> {
	protected canvas: HTMLCanvasElement;
	protected ctx: WebGL2RenderingContext;
	protected width: number;
	protected height: number;

	protected options: TOptions;

	protected wasmMemory!: WebAssembly.Memory;
	protected pixelsArr!: Uint8ClampedArray;
	protected imageData: ImageData;

	protected wasmGraphRenderer!: WasmInterop;
	protected glRenderer: TGLRenderer & IWebGLRenderer;

	public pointer: PointerType;

	private hasInitialized = false;

	private layoutNeedsUpdate = false;

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
		glRenderer: TGLRenderer & IWebGLRenderer,
		options: TOptions,
	) {
		trace();
		if (width < 1) {
			traceWarn("width has to be >=1");
			width = 1;
		}
		if (height < 1) {
			traceWarn("height has to be >=1");
			height = 1;
		}

		canvas.style.width = `${width}px`;
		canvas.style.height = `${height}px`;
		canvas.width = Math.floor(width * devicePixelRatio);
		canvas.height = Math.floor(height * devicePixelRatio);

		const gl = glRenderer.gl;
		gl.viewport(0, 0, canvas.width, canvas.height);

		this.canvas = canvas;
		this.glRenderer = glRenderer;
		this.ctx = gl;
		this.width = canvas.width;
		this.height = canvas.height;
		trace({
			devicePixelRatio,
			canvas_width: canvas.width,
			canvas_height: canvas.height,
			this_width: this.width,
			this_height: this.height,
		});
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
		this.glRenderer.init(memory);

		this.layoutNeedsUpdate = true;
	}

	protected handleLayout() {
		throw new Error(
			"Everything inheriting from GraphRenderer should implement it's own handleLayout function",
		);
	}

	public updateData(_data: TData, _timestamp: number) {
		this.layoutNeedsUpdate = true;
	}

	protected update(_timestamp: number) {
		if (this.layoutNeedsUpdate) {
			this.handleLayout();

			this.layoutNeedsUpdate = false;
		}
	}

	protected render(timestamp: number) {
		this.glRenderer.draw(timestamp);
	}

	public resize(width: number, height: number) {
		trace();
		if (width < 1 || height < 1) {
			logError("Cannot set canvas dimensions to non-positive value", {
				width,
				height,
			});
			return;
		}
		this.canvas.width = Math.floor(width * devicePixelRatio);
		this.canvas.height = Math.floor(height * devicePixelRatio);
		this.ctx.viewport(0, 0, this.canvas.width, this.canvas.height);
		this.canvas.style.width = `${width}px`;
		this.canvas.style.height = `${height}px`;
		this.width = this.canvas.width;
		this.height = this.canvas.height;
		this.wasmGraphRenderer.resize(this.canvas.width, this.canvas.height);
		this.imageData = new ImageData(this.width, this.height);
		this.layoutNeedsUpdate = true;
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
	render(timestamp: number): void;
	handleLayout(): void;
	updateData(data: GraphData, timestamp: number): void;
	isAnimating(): boolean;
	onPointerDown(pointerType: string): void;
	onPointerMove(pointerType: string): void;
	onPointerLeave(): void;
	dispose(): void;
	removeInputEventHandlers(): void;
}
