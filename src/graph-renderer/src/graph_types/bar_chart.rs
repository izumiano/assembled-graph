use std::cmp::max;
use wasm_bindgen::prelude::*;

use crate::graph_types::utils::clear_background;
use crate::graph_types::utils::draw_rect;
use crate::graph_types::utils::Color;
use crate::utils::NumUtils;

#[wasm_bindgen]
pub struct DataPoint {
	_title: String,
	value: f32,
}

#[wasm_bindgen]
impl DataPoint {
	#[wasm_bindgen(constructor)]
	pub fn new(title: String, value: f32) -> DataPoint {
		DataPoint {
			_title: title,
			value,
		}
	}
}

#[wasm_bindgen]
pub struct BarChart {
	data: Vec<DataPoint>,
	pixels: Vec<u8>,
	width: u32,
	height: u32,
	background_color: Color,

	bottom: u32,
	top: u32,
	left: u32,
	right: u32,

	gap: u32,
	min_width: u32,
	min_height: u32,
}

#[wasm_bindgen]
impl BarChart {
	#[wasm_bindgen(constructor)]
	pub fn new(
		data: Vec<DataPoint>,
		width: u32,
		height: u32,
		background_color: Color,

		bottom: u32,
		top: u32,
		left: u32,
		right: u32,
		gap: u32,
		min_width: u32,
		min_height: u32,
	) -> BarChart {
		let size = width * height * 4;
		let pixels = vec![0; size as usize];
		BarChart {
			data,
			pixels,
			width,
			height,
			background_color,

			bottom,
			top,
			left,
			right,

			gap,
			min_width,
			min_height,
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

	fn draw_bars(&mut self, timestamp: u32) {
		let mut base_width = (self.width as i32 - self.left as i32 - self.right as i32
			+ self.gap as i32) as f32
			/ (self.data.len() as f32);

		let height = self.height as i32 - self.top as i32 - self.bottom as i32;
		let unclamped_width = base_width - self.gap as f32;

		if unclamped_width < 0.0 {
			self.left = (self.left as i32 + unclamped_width as i32).to_u32();
			base_width = ((self.width as i32 - self.left as i32 - self.right as i32 + self.gap as i32)
				as f32
				+ unclamped_width)
				/ (self.data.len() as f32);
		}

		for x in 0..self.data.len() {
			let x_pos = (x as f32 * base_width + self.left as f32).to_u32();
			let width = unclamped_width.max(self.min_width as f32).to_u32();
			let height = max(
				(height as f32 * self.data[x].value).to_u32(),
				self.min_height,
			);
			let y_pos = (self.height as i32 - self.bottom as i32 - height as i32).to_u32();
			draw_rect(
				&mut self.pixels,
				self.width,
				self.height,
				x_pos,
				y_pos,
				width,
				height,
				Color {
					r: (x as f32 * 50.0 + (timestamp as f32 / 1000.0).sin() * 100.0) as u8,
					g: (x as f32 * 50.0 + (timestamp as f32 / 1000.0 + 7.5).sin() * 100.0) as u8,
					b: (x as f32 * 50.0 + (timestamp as f32 / 1000.0 + 5.0).sin() * 100.0) as u8,
					a: 255,
				},
			);
		}
	}

	pub fn render(&mut self, timestamp: u32) {
		clear_background(
			&mut self.pixels,
			self.width,
			self.height,
			&self.background_color,
		);

		self.draw_bars(timestamp);
	}
}
