use std::cmp::min;
use wasm_bindgen::prelude::*;

use crate::utils::{NumUtils, lerp};

pub trait GraphRenderer {
	fn get_mut_pixels(&mut self) -> &mut Vec<u8>;
	fn get_width(&self) -> u32;
	fn get_height(&self) -> u32;
	fn draw_rect(&mut self, x: u32, y: u32, width: u32, height: u32, color: &Color);
	fn draw_rect_alpha(&mut self, x: u32, y: u32, width: u32, height: u32, color: &Color);
	#[allow(dead_code)]
	fn draw_circle(&mut self, x: u32, y: u32, radius: u32, color: &Color);
}

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

pub fn draw_rect<TRenderer>(
	renderer: &mut TRenderer,
	x: u32,
	y: u32,
	width: u32,
	height: u32,
	color: &Color,
) where
	TRenderer: GraphRenderer,
{
	let canvas_width = renderer.get_width();
	let canvas_height = renderer.get_height();

	let width = min(width as i32, canvas_width as i32 - x as i32).to_u32();
	let height = min(height as i32, canvas_height as i32 - y as i32).to_u32();

	let pixels = renderer.get_mut_pixels();

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

pub fn draw_rect_alpha<TRenderer>(
	renderer: &mut TRenderer,
	x: u32,
	y: u32,
	width: u32,
	height: u32,
	color: &Color,
) where
	TRenderer: GraphRenderer,
{
	let canvas_width = renderer.get_width();
	let canvas_height = renderer.get_height();

	let width = min(width as i32, canvas_width as i32 - x as i32).to_u32();
	let height = min(height as i32, canvas_height as i32 - y as i32).to_u32();

	let pixels = renderer.get_mut_pixels();

	for curr_y in y..(height + y) {
		for curr_x in x..(width + x) {
			let i = ((curr_y * canvas_width + curr_x) * 4) as usize;
			let ratio = color.a as f32 / 255.;
			pixels[i] = lerp(pixels[i] as f32, color.r as f32, ratio).to_u8();
			pixels[i + 1] = lerp(pixels[i] as f32, color.r as f32, ratio).to_u8();
			pixels[i + 2] = lerp(pixels[i] as f32, color.r as f32, ratio).to_u8();
		}
	}
}

#[allow(dead_code)]
pub fn draw_circle<TRenderer>(renderer: &mut TRenderer, x: u32, y: u32, radius: u32, color: &Color)
where
	TRenderer: GraphRenderer,
{
	let canvas_width = renderer.get_width();
	let canvas_height = renderer.get_height();

	draw_circle_direct(
		renderer.get_mut_pixels(),
		canvas_width,
		canvas_height,
		x,
		y,
		radius,
		color,
	);
}

pub fn draw_circle_direct(
	pixels: &mut [u8],
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

pub fn clear_background(pixels: &mut [u8], canvas_width: u32, canvas_height: u32, color: &Color) {
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
