export function roundToNearestMultiple(number: number, multiple: number) {
	return Math.round(number / multiple) * multiple;
}

export function fillTextWithMaxWidth(
	ctx: CanvasRenderingContext2D,
	title: string,
	x: number,
	y: number,
	maxWidth: number,
	options?: { horizontalAlignment?: "left" | "center" | "right" },
) {
	let textSize = ctx.measureText(title);
	let showFullText = true;

	if (textSize.width > maxWidth) {
		showFullText = false;
		while (
			title.length > 1 &&
			// biome-ignore lint/suspicious/noAssignInExpressions: <intentional>
			(textSize = ctx.measureText(`${title}..`)).width > maxWidth
		) {
			title = title.slice(0, title.length - 1);
		}
	}

	switch (options?.horizontalAlignment) {
		case "center":
			x += maxWidth / 2 - textSize.width / 2;
			break;
		case "right":
			x += maxWidth - textSize.width;
			break;
	}
	if (options?.horizontalAlignment) {
	}

	ctx.fillText(showFullText ? title : `${title}..`, x, y);
}

export async function sleepFor(milliseconds: number) {
	await new Promise((resolve) => setTimeout(resolve, milliseconds));
}
