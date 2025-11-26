export function createGraph(canvas: HTMLCanvasElement) {
	const ctx = canvas.getContext("2d");

	if (!ctx) return;

	const width = canvas.width;
	const height = canvas.height;

	ctx.fillStyle = "black";
	ctx.fillRect(0, 0, width, height);
}
