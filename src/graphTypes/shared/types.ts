import type { Color } from "../graphRenderer";

export interface DataPoint<TLabel> {
	label: TLabel;
	value: number;
}

export type OnSelectionChangeArgs<TLabel> = {
	data: DataPoint<TLabel>;
	positionInfo?: {
		x: number;
		y: number;
		width: number;
		height: number;
	} | null;
	index: number;
} | null;
export type OnSelectionChange<TLabel> =
	| ((args: OnSelectionChangeArgs<TLabel>) => void)
	| undefined;

export type OnHoverArgs<TLabel> = {
	data: DataPoint<TLabel>;
	positionInfo?: {
		x: number;
		y: number;
		width: number;
		height: number;
	} | null;
	pointer: { x: number; y: number; type: string };
	index: number;
} | null;
export type OnHover<TLabel> = ((args: OnHoverArgs<TLabel>) => void) | undefined;

export type PointerCallback<T> =
	| { func: T; includePositionInfo?: false }
	| { func: Exclude<T, undefined>; includePositionInfo: true };

export type OnValueAxisLayoutParams = {
	value: number;
	x: number;
	y: number;
	width: number;
}[];
export type OnLabelsLayout<TLabel> = (
	args: OnLabelsLayoutParams<TLabel>,
) => void;

export type OnLabelsLayoutParams<TLabel> = {
	label: TLabel;
	x: number;
	y: number;
	width: number;
	height: number;
	centerPoint: number;
}[];
export type OnValueAxisLayout = (args: OnValueAxisLayoutParams) => void;

export type ValueAxisOptions = {
	width?: number;
	color?: Color;
	smallestScale?: number;
	minPixelDistance?: number;
};
