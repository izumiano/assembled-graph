export function roundToNearestMultiple(number: number, multiple: number) {
	return Math.round(number / multiple) * multiple;
}

export function fillTextWithMaxWidth(
	ctx: CanvasRenderingContext2D,
	title: string,
	x: number,
	y: number,
	maxWidth: number,
	options?:
		| {
				horizontalAlignment?: "left" | "right";
		  }
		| {
				horizontalAlignment: "center";
				centerPoint?: number;
		  },
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
		case "center": {
			let centerPoint = maxWidth / 2;
			if (options.centerPoint != null) {
				centerPoint = options.centerPoint - x;
			}
			const left = x;
			x += centerPoint - textSize.width / 2;
			x = clamp(x, { min: left, max: left + maxWidth - textSize.width });
			break;
		}
		case "right":
			x += maxWidth - textSize.width;
			break;
	}

	ctx.fillText(showFullText ? title : `${title}..`, x, y);
}

export async function sleepFor(milliseconds: number) {
	await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export type MinMaxType =
	| { min: number; max: number }
	| { min: number; max?: number }
	| { min?: number; max: number }
	| undefined;

export function clamp(value: number, params: MinMaxType) {
	return Math.max(
		params?.min ?? -Infinity,
		Math.min(value, params?.max ?? Infinity),
	);
}
