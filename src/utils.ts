export function roundToNearestMultiple(number: number, multiple: number) {
	return Math.round(number / multiple) * multiple;
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

export type DeepRequired<T> = {
	[P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};
