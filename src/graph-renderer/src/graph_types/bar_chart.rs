use std::cmp::max;
use wasm_bindgen::prelude::*;

use crate::animation::Animation;
use crate::graph_types::utils::*;
use crate::utils::NumUtils;

#[wasm_bindgen]
pub struct DataPoint {
	title: String,
	value: f32,
}

#[wasm_bindgen]
impl DataPoint {
	#[wasm_bindgen(constructor)]
	pub fn new(title: String, value: f32) -> DataPoint {
		DataPoint {
			title: title,
			value,
		}
	}
}

struct DataObject {
	title: String,
	x: u32,
	y: u32,
	width: u32,
	height: u32,
}

struct ScaleLineObject {
	x: u32,
	y: u32,
	width: u32,
	height: u32,
	intensity: u8,
	value: f32,
}

#[wasm_bindgen]
pub struct BarChart {
	data: Vec<DataPoint>,
	pixels: Vec<u8>,
	start_timestamp: f64,
	width: u32,
	height: u32,
	background_color: Color,

	bars: Vec<DataObject>,
	scale_lines: Vec<ScaleLineObject>,
	scale_line_count: u32,

	bottom: u32,
	top: u32,
	left: u32,
	right: u32,

	gap: u32,
	min_width: u32,
	min_height: u32,

	value_axis_width: u32,
	value_axis_smallest_scale: f32,
	value_axis_min_pixel_distance: u32,

	max_val: f32,
}

#[wasm_bindgen]
impl BarChart {
	#[wasm_bindgen(constructor)]
	pub fn new(
		mut data: Vec<DataPoint>,
		start_timestamp: f64,
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

		value_axis_width: u32,
		value_axis_smallest_scale: f32,
		value_axis_min_pixel_distance: u32,
	) -> BarChart {
		let size = width * height * 4;
		let pixels = vec![0; size as usize];
		let mut bars: Vec<DataObject> = Vec::with_capacity(data.len());
		let mut scale_lines: Vec<ScaleLineObject> = Vec::with_capacity(100);
		let scale_line_count = 0;

		let mut max_val = 0.0;
		for i in 0..data.len() {
			bars.push(DataObject {
				title: data[i].title.clone(),
				x: 0,
				y: 0,
				width: 0,
				height: 0,
			});

			max_val = data[i].value.max(max_val);
		}

		for _ in 0..100 {
			scale_lines.push(ScaleLineObject {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				intensity: 0,
				value: 0.0,
			});
		}

		for point in &mut data {
			point.value /= max_val;
		}

		BarChart {
			data,
			pixels,
			start_timestamp,
			width,
			height,
			background_color,

			bars,
			scale_lines,
			scale_line_count,

			bottom,
			top,
			left,
			right,

			gap,
			min_width,
			min_height,

			value_axis_width,
			value_axis_smallest_scale,
			value_axis_min_pixel_distance,

			max_val,
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

	pub fn get_bars_len(&self) -> usize {
		self.bars.len()
	}

	pub fn get_bar_x_at(&self, index: usize) -> u32 {
		self.bars[index].x
	}

	pub fn get_bar_y_at(&self, index: usize) -> u32 {
		self.bars[index].y
	}

	pub fn get_bar_width_at(&self, index: usize) -> u32 {
		self.bars[index].width
	}

	pub fn get_bar_height_at(&self, index: usize) -> u32 {
		self.bars[index].height
	}

	pub fn get_bar_title_at(&self, index: usize) -> String {
		self.bars[index].title.clone()
	}

	pub fn get_scale_lines_count(&self) -> u32 {
		self.scale_line_count
	}

	pub fn get_scale_line_x_at(&self, index: usize) -> u32 {
		self.scale_lines[index].x
	}

	pub fn get_scale_line_y_at(&self, index: usize) -> u32 {
		self.scale_lines[index].y
	}

	pub fn get_scale_line_value_at(&self, index: usize) -> f32 {
		self.scale_lines[index].value
	}

	pub fn resize(&mut self, width: u32, height: u32) {
		self.width = width;
		self.height = height;
		let size = width * height * 4;
		self.pixels = vec![0; size as usize];
	}

	fn draw_bars(&mut self) {
		for obj in &self.bars {
			draw_rect(
				&mut self.pixels,
				self.width,
				self.height,
				obj.x,
				obj.y,
				obj.width,
				obj.height,
				Color {
					r: 255,
					g: 255,
					b: 255,
					a: 255,
				},
			);
		}
	}

	fn calculate_bars(&mut self, timestamp: f64) {
		let mut left = self.left + self.value_axis_width;
		let mut base_width = (self.width as i32 - left as i32 - self.right as i32 + self.gap as i32)
			as f32
			/ (self.data.len() as f32);

		let bottom = self.bottom;

		let height = self.height as i32 - self.top as i32 - bottom as i32;
		let unclamped_width = base_width - self.gap as f32;

		if unclamped_width < 0.0 {
			left = (left as i32 + unclamped_width as i32).to_u32();
			base_width = ((self.width as i32 - left as i32 - self.right as i32 + self.gap as i32) as f32
				+ unclamped_width)
				/ (self.data.len() as f32);
		}

		for x in 0..self.data.len() {
			let animation = Animation {
				start_timestamp: self.start_timestamp,
				start_state: 0.0,
				delay: 100.0 * x as f64,
				animation_time: 500.0,
				end_state: 1.0,
			};
			let height_scale = animation.get_current(timestamp);

			let x_pos = (x as f32 * base_width + left as f32).to_u32();
			let width = unclamped_width.max(self.min_width as f32).to_u32();
			let height = (max(
				(height as f32 * self.data[x].value).to_u32(),
				self.min_height,
			) as f32
				* height_scale) as u32;
			let y_pos = (self.height as i32 - bottom as i32 - height as i32).to_u32();

			let obj = &mut self.bars[x];

			obj.x = x_pos;
			obj.y = y_pos;
			obj.width = width;
			obj.height = height;
		}
	}

	fn draw_scale_lines(&mut self) {
		for i in 0..self.scale_line_count {
			let scale_line = &self.scale_lines[i as usize];
			draw_rect(
				&mut self.pixels,
				self.width,
				self.height,
				scale_line.x,
				scale_line.y,
				scale_line.width,
				scale_line.height,
				Color {
					r: scale_line.intensity,
					g: scale_line.intensity,
					b: scale_line.intensity,
					a: 255,
				},
			);
		}
	}

	fn calculate_scale_lines(&mut self) {
		let thickness = 2;
		let x_offset = self.value_axis_width;

		let smallest_scale = self.value_axis_smallest_scale;
		let min_pixel_dist = self.value_axis_min_pixel_distance as f32;

		let height = (self.height as i32 - self.top as i32 - self.bottom as i32) as f32;
		let mut pixel_distance = (smallest_scale / self.max_val) * height;

		let mut mult = 1;

		if pixel_distance < min_pixel_dist {
			mult = 2i32.pow((min_pixel_dist / pixel_distance).ceil() as u32 - 1);
			pixel_distance *= mult as f32;
		}

		let mut line_count = (height / pixel_distance).to_u32() + 1;
		for i in 1..line_count {
			let ratio = (pixel_distance * i as f32) / height;
			if ratio > 0.99 {
				line_count -= 1;
				continue;
			}

			let value = ratio * self.max_val;

			let modu = (value.round() % (smallest_scale * mult as f32 * 2.0)).to_u32();

			let scale_line = &mut self.scale_lines[i as usize];
			scale_line.x = x_offset;
			scale_line.y = (self.height as i32
				- self.bottom as i32
				- thickness as i32
				- (pixel_distance * i as f32) as i32)
				.to_u32();
			scale_line.width = (self.width as i32 - x_offset as i32).to_u32();
			scale_line.height = thickness;
			scale_line.intensity = if modu == 0 { 150 } else { 80 };
			scale_line.value = value;
		}

		let scale_line = &mut self.scale_lines[0];
		scale_line.x = x_offset;
		scale_line.y = self.top;
		scale_line.width = (self.width as i32 - x_offset as i32).to_u32();
		scale_line.height = thickness;
		scale_line.intensity = 200;
		scale_line.value = self.max_val;

		let scale_line = &mut self.scale_lines[line_count as usize];
		scale_line.x = x_offset;
		scale_line.y = (self.height as i32 - self.bottom as i32 - thickness as i32).to_u32();
		scale_line.width = (self.width as i32 - x_offset as i32).to_u32();
		scale_line.height = thickness;
		scale_line.intensity = 200;
		scale_line.value = 0.0;

		self.scale_line_count = line_count + 1;
	}

	pub fn update(&mut self, timestamp: f64) {
		self.calculate_scale_lines();
		self.calculate_bars(timestamp);
	}

	pub fn render(&mut self) {
		clear_background(
			&mut self.pixels,
			self.width,
			self.height,
			&self.background_color,
		);

		self.draw_scale_lines();

		self.draw_bars();
	}
}
