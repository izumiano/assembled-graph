use proc_macros::*;
use std::cmp::max;
use std::cmp::min;
use wasm_bindgen::prelude::*;

use crate::DefineAnimation;
use crate::animation::Animation;
use crate::animation::AnimationData;
use crate::animation::AnimationStateData;
use crate::graph_types::utils::*;
use crate::log;
use crate::utils::NumUtils;

#[wasm_struct]
pub struct DataPoint {
	title: String,
	value: f32,
}

#[derive(Debug)]
enum PointerState {
	None,
	Hover,
}

#[derive(Debug)]
enum SelectedState {
	None { timestamp: f64 },
	Selected { timestamp: f64 },
}

impl SelectedState {
	fn get_timestamp(&self) -> f64 {
		match self {
			SelectedState::None { timestamp } => *timestamp,
			SelectedState::Selected { timestamp } => *timestamp,
		}
	}
}

DefineAnimation!(BarHoverAnimationData, CurrentBarHoverAnimData, scale);

DefineAnimation!(BarHeightAnimData, CurrentBarHeightAnimData, scale);

DefineAnimation!(SelectBarAnimData, CurrentSelectBarAnimData, color_t);
DefineAnimation!(ClickingBarAnimData, CurrentClickingBarAnimData, color_t);

#[derive(Debug)]
struct BarData {
	title: String,
	// _value: f32,
	x: u32,
	y: u32,
	width: u32,
	height: u32,
	scale: f32,
	color_t: f32,
	color: Color,
	pointer_state: PointerState,
	selected_state: SelectedState,

	hover_anim: BarHoverAnimationData,
	clicking_state: ClickingState,
	clicking_bar_anim: ClickingBarAnimData,
}

struct ScaleLineObject {
	x: u32,
	y: u32,
	width: u32,
	height: u32,
	intensity: u8,
	value: f32,
}

#[wasm_struct]
pub struct Positioning {
	bottom: u32,
	top: u32,
	left: u32,
	right: u32,
}

#[wasm_struct]
pub struct BarLayout {
	gap: u32,
	bar_corner_radius: u32,
	min_width: u32,
	min_height: u32,
}

#[wasm_struct]
pub struct ValueAxisLayout {
	value_axis_width: u32,
	value_axis_smallest_scale: f32,
	value_axis_min_pixel_distance: u32,
}

#[wasm_struct]
pub struct BarChartLayout {
	positioning: Positioning,

	bar_layout: BarLayout,
	value_axis_layout: ValueAxisLayout,
}

#[wasm_bindgen]
#[derive(Debug, Clone)]
pub enum ClickingState {
	None,
	Holding,
	JustReleased,
}

#[wasm_bindgen]
pub struct BarChart {
	data: Vec<DataPoint>,
	pixels: Vec<u8>,
	start_timestamp: f64,
	width: u32,
	height: u32,
	background_color: Color,

	bars: Vec<BarData>,
	scale_lines: Vec<ScaleLineObject>,
	scale_line_count: u32,

	bottom: u32,
	top: u32,
	left: u32,
	right: u32,

	gap: u32,
	bar_corner_radius: u32,
	min_width: u32,
	min_height: u32,

	value_axis_width: u32,
	value_axis_smallest_scale: f32,
	value_axis_min_pixel_distance: u32,

	hover_scale: f32,

	max_val: f32,

	is_animating: bool,
	selected_bar_index: Option<usize>,
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

		layout: BarChartLayout,

		hover_scale: f32,
	) -> BarChart {
		let size = width * height * 4;
		let pixels = vec![0; size as usize];
		let mut bars: Vec<BarData> = Vec::with_capacity(data.len());
		let mut scale_lines: Vec<ScaleLineObject> = Vec::with_capacity(100);
		let scale_line_count = 0;

		let mut max_val = 0.0;
		for data_point in &data {
			bars.push(BarData {
				title: data_point.title.clone(),
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				scale: 1.0,
				color_t: 0.,
				color: Color {
					r: 255,
					g: 255,
					b: 255,
					a: 255,
				},
				pointer_state: PointerState::None,
				selected_state: SelectedState::None {
					timestamp: start_timestamp,
				},
				hover_anim: BarHoverAnimationData {
					timestamp: start_timestamp,
					scale: AnimationStateData { from: 1.0, to: 1.0 },
				},
				clicking_state: ClickingState::None,
				clicking_bar_anim: ClickingBarAnimData {
					timestamp: start_timestamp,
					color_t: AnimationStateData { from: 0., to: 0. },
				},
			});

			max_val = data_point.value.max(max_val);
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

			bottom: layout.positioning.bottom,
			top: layout.positioning.top,
			left: layout.positioning.left,
			right: layout.positioning.right,

			gap: layout.bar_layout.gap,
			bar_corner_radius: layout.bar_layout.bar_corner_radius,
			min_width: layout.bar_layout.min_width,
			min_height: layout.bar_layout.min_height,

			value_axis_width: layout.value_axis_layout.value_axis_width,
			value_axis_smallest_scale: layout.value_axis_layout.value_axis_smallest_scale,
			value_axis_min_pixel_distance: layout.value_axis_layout.value_axis_min_pixel_distance,

			hover_scale,

			max_val,
			is_animating: true,
			selected_bar_index: None,
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

	pub fn get_is_animating(&self) -> bool {
		self.is_animating
	}

	pub fn get_selected_bar_index(&self) -> Option<usize> {
		self.selected_bar_index
	}

	fn draw_bars(&mut self) {
		for i in 0..self.bars.len() {
			let bar = &self.bars[i];
			let corner_radius = min(self.bar_corner_radius, bar.width / 2);
			let color = bar.color.clone();
			let width = (bar.width as f32 * bar.scale) as u32;
			let left = (bar.x as i32 - (width as i32 - bar.width as i32) / 2).to_u32();
			let bar_y = bar.y;
			let bar_height = bar.height;

			self.draw_rect(
				left,
				bar_y + corner_radius,
				width,
				(bar_height as i32 - corner_radius as i32).to_u32(),
				&color,
			);

			self.draw_rect(
				left + corner_radius,
				bar_y,
				(width as i32 - corner_radius as i32 * 2).to_u32(),
				min(corner_radius, bar_height),
				&color,
			);

			draw_circle_direct(
				&mut self.pixels,
				self.width,
				(self.height as i32 - self.bottom as i32).to_u32(),
				left + corner_radius,
				bar_y + corner_radius,
				corner_radius,
				&color,
			);

			draw_circle_direct(
				&mut self.pixels,
				self.width,
				(self.height as i32 - self.bottom as i32).to_u32(),
				((left + width) as i32 - corner_radius as i32).to_u32(),
				bar_y + corner_radius,
				corner_radius,
				&color,
			);
		}
	}

	fn toggle_bar_selection_at(&mut self, index: usize, timestamp: f64) {
		for i in 0..self.bars.len() {
			let selected = i == index;

			if selected {
				if let SelectedState::Selected { timestamp: _ } = self.bars[i].selected_state {
					self.bars[i].selected_state = SelectedState::None { timestamp };
					self.selected_bar_index = None;
				} else {
					self.bars[i].selected_state = SelectedState::Selected { timestamp };
					self.selected_bar_index = Some(index);
				}
			} else if let SelectedState::None { timestamp: _ } = self.bars[i].selected_state {
			} else {
				self.bars[i].selected_state = SelectedState::None { timestamp };
			}
		}
	}

	fn deselect_bars(&mut self, timestamp: f64) {
		for i in 0..self.bars.len() {
			let selected = matches!(
				self.bars[i].selected_state,
				SelectedState::Selected { timestamp: _ }
			);

			if selected {
				self.bars[i].selected_state = SelectedState::None { timestamp };
			}
		}
		self.selected_bar_index = None;
	}

	fn calculate_bars(
		&mut self,
		timestamp: f64,
		pointer_x: Option<u32>,
		pointer_y: Option<u32>,
		clicking_state: ClickingState,
	) {
		let bars_count = self.data.len();

		let mut left = self.left + self.value_axis_width;
		let mut base_width = (self.width as i32 - left as i32 - self.right as i32 + self.gap as i32)
			as f32
			/ (bars_count as f32);

		let bottom = self.bottom;

		let height = self.height as i32 - self.top as i32 - bottom as i32;
		let unclamped_width = base_width - self.gap as f32;

		if unclamped_width < 0.0 {
			left = (left as i32 + unclamped_width as i32).to_u32();
			base_width = ((self.width as i32 - left as i32 - self.right as i32 + self.gap as i32) as f32
				+ unclamped_width)
				/ (bars_count as f32);
		}

		let mut all_animations_done = true;
		let mut any_bar_was_clicked = false;

		for x in 0..bars_count {
			let anim_data = BarHeightAnimData {
				timestamp: self.start_timestamp,
				scale: AnimationStateData { from: 0.0, to: 1.0 },
			};
			let animation = Animation::new(&anim_data, timestamp, 500.0, 100.0 * x as f64);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			let height_scale = animation.get_current().scale;

			let x_pos = (x as f32 * base_width + left as f32).to_u32();
			let width = unclamped_width.max(self.min_width as f32).to_u32();
			let height = (max(
				(height as f32 * self.data[x].value).to_u32(),
				self.min_height,
			) as f32
				* height_scale) as u32;
			let y_pos = (self.height as i32 - bottom as i32 - height as i32).to_u32();

			let bar = &mut self.bars[x];

			bar.x = x_pos;
			bar.y = y_pos;
			bar.width = width;
			bar.height = height;

			if let Some(pointer_x) = pointer_x
				&& let Some(pointer_y) = pointer_y
				&& pointer_x >= x_pos
				&& pointer_x <= x_pos + width
				&& pointer_y >= y_pos
				&& pointer_y <= y_pos + height
			{
				if let PointerState::Hover = bar.pointer_state {
				} else {
					bar.pointer_state = PointerState::Hover;
					bar.hover_anim = BarHoverAnimationData {
						timestamp,
						scale: AnimationStateData {
							from: bar.scale,
							to: self.hover_scale,
						},
					};
				}

				match clicking_state {
					ClickingState::Holding => {
						if let ClickingState::Holding = bar.clicking_state {
						} else {
							bar.clicking_bar_anim = ClickingBarAnimData {
								timestamp,
								color_t: AnimationStateData {
									from: bar.color_t,
									to: 0.5,
								},
							};
							bar.clicking_state = ClickingState::Holding;
						}
					}
					ClickingState::JustReleased => {
						bar.clicking_bar_anim = ClickingBarAnimData {
							timestamp,
							color_t: AnimationStateData {
								from: bar.color_t,
								to: 0.,
							},
						};
						bar.clicking_state = ClickingState::JustReleased;

						self.toggle_bar_selection_at(x, timestamp);
						any_bar_was_clicked = true;
					}
					_ => {}
				}
			} else if let PointerState::None = bar.pointer_state {
			} else {
				bar.pointer_state = PointerState::None;

				bar.hover_anim = BarHoverAnimationData {
					timestamp,
					scale: AnimationStateData {
						from: bar.scale,
						to: 1.0,
					},
				};
				bar.clicking_bar_anim = ClickingBarAnimData {
					timestamp,
					color_t: AnimationStateData {
						from: bar.color_t,
						to: 0.,
					},
				};
				bar.clicking_state = ClickingState::None;
			}

			let bar = &mut self.bars[x];

			let animation = Animation::new(&bar.hover_anim, timestamp, 200.0, 0.0);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			bar.scale = animation.get_current().scale;

			let anim_data = SelectBarAnimData {
				color_t: match bar.selected_state {
					SelectedState::None { timestamp: _ } => AnimationStateData { from: 1., to: 0. },
					SelectedState::Selected { timestamp: _ } => AnimationStateData { from: 0., to: 1. },
				},
				timestamp: bar.selected_state.get_timestamp(),
			};
			let animation = Animation::new(&anim_data, timestamp, 200.0, 0.0);

			bar.color = Color {
				r: 255,
				g: 255,
				b: 255,
				a: 255,
			}
			.lerp(
				Color {
					r: 100,
					g: 100,
					b: 255,
					a: 255,
				},
				animation.get_current().color_t,
			);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			let animation = Animation::new(&bar.clicking_bar_anim, timestamp, 200.0, 0.0);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			bar.color_t = animation.get_current().color_t;

			bar.color = bar.color.lerp(
				Color {
					r: 150,
					g: 150,
					b: 150,
					a: 255,
				},
				bar.color_t,
			);

			log!(bar.color_t);
		}

		if matches!(clicking_state, ClickingState::JustReleased) && !any_bar_was_clicked {
			self.deselect_bars(timestamp);
			all_animations_done = false;
		}

		self.is_animating = !all_animations_done;
	}

	fn draw_scale_lines(&mut self) {
		for i in 0..self.scale_line_count {
			let scale_line = &self.scale_lines[i as usize];
			self.draw_rect(
				scale_line.x,
				scale_line.y,
				scale_line.width,
				scale_line.height,
				&Color {
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

		let mut mult: i64 = 1;

		if pixel_distance < min_pixel_dist {
			mult = (min_pixel_dist / pixel_distance).ceil_nearest_power_2() as i64;
			pixel_distance *= mult as f32;
		}

		let line_count = (height / pixel_distance).to_u32() + 1;
		let mut success_line_count = line_count;
		for i in 1..line_count {
			let total_pixel_dist = pixel_distance * i as f32;

			if (self.height as f32 - self.bottom as f32 - total_pixel_dist - self.top as f32)
				< min_pixel_dist * (2.0 / 3.0)
			{
				success_line_count -= 1;
				continue;
			}

			let ratio = total_pixel_dist / height;

			let value = ratio * self.max_val;

			let modu = (value.round() % (smallest_scale * mult as f32 * 2.0)).to_u32();
			let y =
				(self.height as i32 - self.bottom as i32 - thickness as i32 - total_pixel_dist as i32)
					.to_u32();

			let scale_line = &mut self.scale_lines[i as usize];
			scale_line.x = x_offset;
			scale_line.y = y;
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

		let scale_line = &mut self.scale_lines[success_line_count as usize];
		scale_line.x = x_offset;
		scale_line.y = (self.height as i32 - self.bottom as i32 - thickness as i32).to_u32();
		scale_line.width = (self.width as i32 - x_offset as i32).to_u32();
		scale_line.height = thickness;
		scale_line.intensity = 200;
		scale_line.value = 0.0;

		self.scale_line_count = success_line_count + 1;
	}

	pub fn update(
		&mut self,
		timestamp: f64,
		pointer_x: Option<u32>,
		pointer_y: Option<u32>,
		clicking_state: ClickingState,
	) {
		self.calculate_scale_lines();
		self.calculate_bars(timestamp, pointer_x, pointer_y, clicking_state);
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

impl GraphRenderer for BarChart {
	fn get_mut_pixels(&mut self) -> &mut Vec<u8> {
		&mut self.pixels
	}
	fn get_width(&self) -> u32 {
		self.width
	}
	fn get_height(&self) -> u32 {
		self.height
	}
	fn draw_rect(&mut self, x: u32, y: u32, width: u32, height: u32, color: &Color) {
		draw_rect(self, x, y, width, height, color);
	}
	fn draw_circle(&mut self, x: u32, y: u32, radius: u32, color: &Color) {
		draw_circle(self, x, y, radius, color);
	}
}
