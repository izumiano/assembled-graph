use std::cmp::min;
use wasm_bindgen::prelude::*;

mod logging;

#[wasm_bindgen]
pub struct Color {
	r: u8,
	g: u8,
	b: u8,
	a: u8,
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

struct DrawBarsInfo {
	bottom: u32,
	top: u32,
	left: u32,
	right: u32,
	gap: u32,
	count: u32,
}

#[wasm_bindgen]
pub struct CanvasPixels {
	pixels: Vec<u8>,
	width: u32,
	height: u32,
	background_color: Color,
}

#[wasm_bindgen]
impl CanvasPixels {
	#[wasm_bindgen(constructor)]
	pub fn new(width: u32, height: u32, background_color: Color) -> CanvasPixels {
		let size = width * height * 4;
		let pixels = vec![0; size as usize];
		CanvasPixels {
			pixels,
			width,
			height,
			background_color,
		}
	}

	pub fn pixels_ptr(&self) -> *const u8 {
		self.pixels.as_ptr()
	}

	pub fn get_width(&self) -> u32 {
		self.width
	}

	pub fn get_height(&self) -> u32 {
		self.height
	}

	pub fn resize(&mut self, width: u32, height: u32) {
		self.width = width;
		self.height = height;
		let size = width * height * 4;
		self.pixels = vec![0; size as usize];
	}

	pub fn draw_rect(&mut self, x: u32, y: u32, width: u32, height: u32, color: Color) {
		let width = min(width, self.width as u32 - x);
		let height = min(height, self.height as u32 - y);

		for curr_y in y..(height + y) {
			for curr_x in x..(width + x) {
				let i = ((curr_y * self.width + curr_x) * 4) as usize;
				self.pixels[i] = color.r;
				self.pixels[i + 1] = color.g;
				self.pixels[i + 2] = color.b;
				self.pixels[i + 3] = color.a;
			}
		}
	}

	fn draw_bars(&mut self, info: DrawBarsInfo) {
		let width =
			((self.width - info.left - info.right + info.gap) as f32 / info.count as f32) as u32;

		for x in 0..info.count {
			self.draw_rect(
				x * width + info.left,
				info.top,
				width - info.gap,
				self.height - info.top - info.bottom,
				Color {
					r: x as u8 * 50,
					g: 50,
					b: 0,
					a: 255,
				},
			);
		}
	}

	pub fn update_pixels(&mut self, timestamp: u32) {
		for y in 0..self.height {
			for x in 0..self.width {
				let i = ((y * self.width + x) * 4) as usize;
				self.pixels[i] = self.background_color.r;
				self.pixels[i + 1] = self.background_color.g;
				self.pixels[i + 2] = self.background_color.b;
				self.pixels[i + 3] = self.background_color.a;
			}
		}

		self.draw_bars(DrawBarsInfo {
			bottom: 10,
			top: 10,
			left: 20,
			right: 20,
			gap: 50,
			count: 5,
		});
	}
}
