use proc_macros::wasm_struct;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub enum ClickingState {
	None,
	Holding,
	JustReleased,
}

#[derive(Debug, Clone, Copy)]
pub struct ScaleLineObject {
	pub x: u32,
	pub y: u32,
	pub width: u32,
	pub height: u32,
	pub intensity: u8,
	pub value: f32,
}

#[derive(Debug, Clone, Copy)]
pub enum PointerState {
	None,
	Hover,
}

#[derive(Debug, Copy, Clone)]
pub enum SelectedState {
	None { timestamp: f64 },
	Selected { timestamp: f64 },
}

impl SelectedState {
	pub fn get_timestamp(&self) -> f64 {
		match self {
			SelectedState::None { timestamp } => *timestamp,
			SelectedState::Selected { timestamp } => *timestamp,
		}
	}
}

#[wasm_struct]
pub struct Positioning {
	pub bottom: u32,
	pub top: u32,
	pub left: u32,
	pub right: u32,
}

#[wasm_struct]
pub struct ValueAxisLayout {
	pub value_axis_width: u32,
	pub value_axis_smallest_scale: f32,
	pub value_axis_min_pixel_distance: u32,
}
