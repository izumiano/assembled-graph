import init, { type InitOutput } from "./graph-renderer/pkg/graph_renderer.js";
import type {
	GraphRenderer,
	IGraphRenderer,
	WasmGraphRendererInterop,
} from "./graphTypes/graphRenderer.js";
import { sleepFor } from "./utils.js";

export default class GraphManager {
	private initOutput: InitOutput;
	private renderers: (IGraphRenderer &
		GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>)[] = [];
	private timestamp!: number;

	private constructor(initOutput: InitOutput) {
		this.initOutput = initOutput;
	}

	public static async create() {
		const initOutput = await init();
		const manager = new GraphManager(initOutput);

		requestAnimationFrame((timestamp) => {
			manager.timestamp = timestamp;
			manager.handleAnimation(timestamp);
		});

		while (manager.timestamp == null) {
			await sleepFor(10);
		}

		return manager;
	}

	private handleAnimation(timestamp: number) {
		this.renderers.forEach((renderer) => {
			if (!renderer.isAnimating()) {
				return;
			}
			renderer.update(timestamp, renderer.pointer, false);
			renderer.render();
		});

		this.timestamp = timestamp;

		requestAnimationFrame(this.handleAnimation.bind(this));
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
		renderer.update(this.timestamp, null, false);
		renderer.render();

		const canvas = renderer.getCanvas();
		this.handleInput(canvas, renderer);

		this.renderers.push(renderer);

		return renderer;
	}

	private handleClick(
		e: MouseEvent,
		canvas: HTMLCanvasElement,
		renderer: IGraphRenderer &
			GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>,
	) {
		const rect = canvas.getBoundingClientRect();
		const mouseX = e.clientX - rect.left;
		const mouseY = e.clientY - rect.top;
		renderer.pointer = { x: mouseX, y: mouseY };
		renderer.update(this.timestamp, renderer.pointer, true);
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
		renderer.pointer = { x: mouseX, y: mouseY };
		renderer.update(this.timestamp, renderer.pointer, false);
	}

	private handleEndInput(
		renderer: IGraphRenderer &
			GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>,
	) {
		renderer.pointer = null;
		renderer.update(this.timestamp, renderer.pointer, false);
	}

	private handleInput(
		canvas: HTMLCanvasElement,
		renderer: IGraphRenderer &
			GraphRenderer<unknown, WasmGraphRendererInterop<unknown>>,
	) {
		canvas.addEventListener("mousedown", (e) =>
			this.handleClick(e, canvas, renderer),
		);

		canvas.addEventListener("mousemove", (e) =>
			this.handleMoveInput(e, canvas, renderer),
		);

		canvas.addEventListener("mouseleave", () => {
			this.handleEndInput(renderer);
		});

		canvas.addEventListener("touchstart", (e) => {
			e.preventDefault();
			const touch = e.touches[0];
			if (!touch) {
				return;
			}
			this.handleMoveInput(touch, canvas, renderer);
		});

		canvas.addEventListener("touchmove", (e) => {
			const touch = e.touches[0];
			if (!touch) {
				return;
			}
			e.preventDefault();
			this.handleMoveInput(touch, canvas, renderer);
		});

		canvas.addEventListener("touchcancel", (e) => {
			if (e.targetTouches.length > 0) {
				return;
			}
			e.preventDefault();
			this.handleEndInput(renderer);
		});

		canvas.addEventListener("touchend", (e) => {
			if (e.targetTouches.length > 0) {
				return;
			}
			e.preventDefault();

			renderer.update(this.timestamp, renderer.pointer, true);
			renderer.pointer = null;
		});
	}
}
