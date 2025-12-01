use std::cmp::min;
use wasm_bindgen::prelude::*;

use crate::utils::NumUtils;

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
		Color {
			r: r,
			g: g,
			b: b,
			a: a,
		}
	}
}

pub fn draw_rect(
	pixels: &mut Vec<u8>,
	canvas_width: u32,
	canvas_height: u32,
	x: u32,
	y: u32,
	width: u32,
	height: u32,
	color: &Color,
) {
	let width = min(width as i32, canvas_width as i32 - x as i32).to_u32();
	let height = min(height as i32, canvas_height as i32 - y as i32).to_u32();

	for curr_y in y..(height + y) {
		for curr_x in x..(width + x) {
			let i = ((curr_y * canvas_width + curr_x) * 4) as usize;
			pixels[i] = color.r;
			pixels[i + 1] = color.g;
			pixels[i + 2] = color.b;
			pixels[i + 3] = color.a;
		}
	}
}

pub fn draw_circle(
	pixels: &mut Vec<u8>,
	canvas_width: u32,
	canvas_height: u32,
	x: u32,
	y: u32,
	radius: u32,
	color: &Color,
) {
	let start_x = (x as i32 - radius as i32).to_u32();
	let end_x = min(x + radius, canvas_width);

	let start_y = (y as i32 - radius as i32).to_u32();
	let end_y = min(y + radius, canvas_height);

	for curr_y in start_y..end_y {
		for curr_x in start_x..end_x {
			let x_dist = x as i32 - curr_x as i32;
			let y_dist = y as i32 - curr_y as i32;
			if (x_dist * x_dist + y_dist * y_dist) as u32 > radius * radius {
				continue;
			}

			let i = ((curr_y * canvas_width + curr_x) * 4) as usize;
			pixels[i] = color.r;
			pixels[i + 1] = color.g;
			pixels[i + 2] = color.b;
			pixels[i + 3] = color.a;
		}
	}
}

pub fn clear_background(
	pixels: &mut Vec<u8>,
	canvas_width: u32,
	canvas_height: u32,
	color: &Color,
) {
	for y in 0..canvas_height {
		for x in 0..canvas_width {
			let i = ((y * canvas_width + x) * 4) as usize;
			pixels[i] = color.r;
			pixels[i + 1] = color.g;
			pixels[i + 2] = color.b;
			pixels[i + 3] = color.a;
		}
	}
}
