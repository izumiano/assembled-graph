import init, { type InitOutput } from "./graph-renderer/pkg/graph_renderer.js";
import type {
	GraphRenderer,
	IGraphRenderer,
	WasmGraphRendererInterop,
} from "./graphTypes/graphRenderer.js";
import { sleepFor } from "./utils.js";

export type ClickingState = "None" | "Holding" | "JustReleased";

export default class GraphManager {
	private initOutput: InitOutput;
	private renderers: Set<
		IGraphRenderer & GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>
	> = new Set();
	private timestamp!: number;

	private pointerStart: {
		touchId: number | undefined;
	} | null = null;

	private constructor(initOutput: InitOutput) {
		this.initOutput = initOutput;
	}

	public static async create(
		abortSignal?: AbortSignal,
	): Promise<GraphManager | null> {
		const initOutput = await init();
		if (abortSignal?.aborted) {
			console.warn("aborted");
			return null;
		}
		const manager = new GraphManager(initOutput);

		requestAnimationFrame((timestamp) => {
			manager.timestamp = timestamp;
			manager.handleAnimation(timestamp, abortSignal);
		});

		while (manager.timestamp == null) {
			await sleepFor(10);
		}
		if (abortSignal?.aborted) {
			console.warn("aborted");
			return null;
		}

		return manager;
	}

	public dispose() {
		this.renderers.forEach((renderer) => {
			renderer.dispose();
		});
		this.renderers.clear();
	}

	private handleAnimation(timestamp: number, abortSignal?: AbortSignal) {
		if (abortSignal?.aborted) {
			console.warn("aborted");
			return;
		}

		this.renderers.forEach((renderer) => {
			if (!renderer.isAnimating()) {
				return;
			}
			renderer.update(timestamp);
			renderer.render();
		});

		this.timestamp = timestamp;

		requestAnimationFrame((timestamp) => {
			this.handleAnimation.bind(this)(timestamp, abortSignal);
		});
	}

	public getTimestamp() {
		return this.timestamp ?? 0;
	}

	public addGraph<
		TGraphRenderer extends GraphRenderer<
			unknown,
			WasmGraphRendererInterop<unknown>
		> &
			IGraphRenderer,
	>(renderer: TGraphRenderer) {
		renderer.init(this.initOutput.memory, this.timestamp);
		renderer.update(this.timestamp);
		renderer.render();

		const canvas = renderer.getCanvas();
		this.addInputHandling(canvas, renderer);

		this.renderers.add(renderer);

		return renderer;
	}

	public removeGraph<
		TGraphRenderer extends GraphRenderer<
			unknown,
			WasmGraphRendererInterop<unknown>
		> &
			IGraphRenderer,
	>(renderer: TGraphRenderer) {
		renderer.dispose();

		this.renderers.delete(renderer);
	}

	private handleClick(
		e: MouseEvent | Touch,
		canvas: HTMLCanvasElement,
		renderer: IGraphRenderer &
			GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>,
		touchId?: number,
	) {
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		renderer.pointer = {
			x: mouseX * devicePixelRatio,
			y: mouseY * devicePixelRatio,
			clickingState: "Holding",
		};
		this.pointerStart = { touchId };
		renderer.update(this.timestamp);
	}

	private handleMoveInput(
		e: MouseEvent | Touch,
		canvas: HTMLCanvasElement,
		renderer: IGraphRenderer &
			GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>,
	) {
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		renderer.pointer = {
			x: mouseX * devicePixelRatio,
			y: mouseY * devicePixelRatio,
			clickingState: this.pointerStart ? "Holding" : "None",
		};

		renderer.update(this.timestamp);
	}

	private handleEndInput(
		renderer: IGraphRenderer &
			GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>,
	) {
		renderer.pointer.clickingState = "JustReleased";
		renderer.update(this.timestamp);
		renderer.pointer.clickingState = "None";
		this.pointerStart = null;
	}

	private handleCancelInput(
		renderer: IGraphRenderer &
			GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>,
	) {
		renderer.pointer = { x: -1, y: -1, clickingState: "None" };
		renderer.update(this.timestamp);
	}

	private addInputHandling(
		canvas: HTMLCanvasElement,
		renderer: IGraphRenderer &
			GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>,
	) {
		renderer.addInputEventHandler({
			type: "mousedown",
			handler: (e) => this.handleClick(e, canvas, renderer),
			canvas,
		});

		renderer.addInputEventHandler({
			type: "mousemove",
			handler: (e) => this.handleMoveInput(e, canvas, renderer),
			canvas,
		});

		renderer.addInputEventHandler({
			type: "mouseup",
			handler: () => this.handleEndInput(renderer),
			canvas,
		});

		renderer.addInputEventHandler({
			type: "mouseleave",
			handler: () => this.handleCancelInput(renderer),
			canvas,
		});

		renderer.addInputEventHandler({
			type: "touchstart",
			handler: (e) => {
				e.preventDefault();
				const touch = e.touches[0];
				if (!touch) {
					return;
				}
				this.handleClick(touch, canvas, renderer, touch.identifier);
			},
			canvas,
		});

		renderer.addInputEventHandler({
			type: "touchmove",
			handler: (e) => {
				const touch = e.touches[0];
				if (!touch) {
					return;
				}
				e.preventDefault();
				this.handleMoveInput(touch, canvas, renderer);
			},
			canvas,
		});

		renderer.addInputEventHandler({
			type: "touchcancel",
			handler: (e) => {
				if (e.targetTouches.length > 0) {
					return;
				}
				e.preventDefault();
				renderer.pointer = { x: -1, y: -1, clickingState: "None" };
				renderer.update(this.timestamp);
			},
			canvas,
		});

		renderer.addInputEventHandler({
			type: "touchend",
			handler: (e) => {
				e.preventDefault();

				for (const touch of e.changedTouches) {
					if (touch.identifier === this.pointerStart?.touchId) {
						this.handleEndInput(renderer);
						renderer.pointer = { x: -1, y: -1, clickingState: "None" };
					}
				}
			},
			canvas,
		});
	}
}
