import type { Color } from "../graphRenderer";

export type PointerCallback<T> =
	| { func: T; includePositionInfo?: false }
	| { func: Exclude<T, undefined>; includePositionInfo: true };

export type OnValueAxisLayoutParams = {
	value: number;
	x: number;
	y: number;
	width: number;
}[];
export type OnValueAxisLayout = (args: OnValueAxisLayoutParams) => void;

export type ValueAxisOptions = {
	width?: number;
	color?: Color;
	smallestScale?: number;
	minPixelDistance?: number;
};
