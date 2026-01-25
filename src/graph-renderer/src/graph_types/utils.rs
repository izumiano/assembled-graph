use wasm_bindgen::prelude::*;

use crate::utils::NumUtils;

#[derive(Debug, Copy, Clone)]
#[wasm_bindgen]
pub struct Color {
	pub r: u8,
	pub g: u8,
	pub b: u8,
	pub a: u8,
}

#[wasm_bindgen]
impl Color {
	#[wasm_bindgen(constructor)]
	pub fn new(r: u8, g: u8, b: u8, a: u8) -> Color {
		Color { r, g, b, a }
	}

	pub fn lerp(&self, other: &Color, t: f32) -> Color {
		let t = t.clamp(0.0, 1.0);

		Color {
			r: (self.r as i32 + ((other.r as f32 - self.r as f32) * t) as i32).to_u8(),
			g: (self.g as i32 + ((other.g as f32 - self.g as f32) * t) as i32).to_u8(),
			b: (self.b as i32 + ((other.b as f32 - self.b as f32) * t) as i32).to_u8(),
			a: (self.a as i32 + ((other.a as f32 - self.a as f32) * t) as i32).to_u8(),
		}
	}
}
