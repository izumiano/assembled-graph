import init, { type InitOutput } from "./graph-renderer/pkg/graph_renderer.js";
import type { IGraphRenderer } from "./graphTypes/graphRenderer.js";
import { sleepFor } from "./utils.js";

export default class GraphManager {
	private initOutput: InitOutput;
	private renderers: IGraphRenderer[] = [];
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
			renderer.update(timestamp);
			renderer.render();
		});

		this.timestamp = timestamp;

		requestAnimationFrame(this.handleAnimation.bind(this));
	}

	public getTimestamp() {
		return this.timestamp ?? 0;
	}

	public addGraph(renderer: IGraphRenderer) {
		renderer.init(this.initOutput.memory, this.timestamp);
		renderer.update(this.timestamp);
		renderer.render();

		this.renderers.push(renderer);

		return renderer;
	}
}
