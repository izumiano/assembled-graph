use proc_macros::*;
use std::cmp::max;
use std::cmp::min;
use wasm_bindgen::prelude::*;

use crate::DefineAnimation;
use crate::animation::*;
use crate::graph_types::shared::consts::VERTICES_PER_QUAD;
use crate::graph_types::shared::types::ClickingState;
use crate::graph_types::shared::types::PointerState;
use crate::graph_types::shared::types::Positioning;
use crate::graph_types::shared::types::ScaleLineObject;
use crate::graph_types::shared::types::SelectedState;
use crate::graph_types::shared::types::ValueAxisLayout;
use crate::graph_types::utils::*;
use crate::log_warn;
use crate::trace;
use crate::utils::*;

DefineAnimation!(BarHoverAnimationData, CurrentBarHoverAnimData, scale);

DefineAnimation!(BarHeightAnimData, CurrentBarHeightAnimData, scale_t);

DefineAnimation!(SelectBarAnimData, CurrentSelectBarAnimData, color_t);
DefineAnimation!(ClickingBarAnimData, CurrentClickingBarAnimData, color_t);

#[wasm_struct]
pub struct BarChartDataPoint {
	value: f32,
}

#[derive(Debug)]
struct BarData {
	x: u32,
	y: u32,
	width: u32,
	height: u32,
	scale: f32,
	color_t: f32,
	color: Color,
	pointer_state: PointerState,
	selected_state: SelectedState,

	start_scale_t: f32,
	hover_anim: BarHoverAnimationData,
	clicking_state: ClickingState,
	clicking_bar_anim: ClickingBarAnimData,
}

#[wasm_struct]
pub struct BarLayout {
	gap: u32,
	bar_corner_radius: u32,
	min_width: u32,
	min_height: u32,
}

#[wasm_struct]
pub struct BarChartLayout {
	positioning: Positioning,

	bar_layout: BarLayout,
	value_axis_layout: ValueAxisLayout,
}

#[wasm_struct]
pub struct BarOptions {
	color: Color,
	hover_color: Color,
	selected_color: Color,
	hover_scale: f32,
	max_bars: usize,
}

#[wasm_struct]
pub struct BarChartOptions {
	background_color: Color,
	bar_options: BarOptions,
	value_axis_color: Color,
}

#[wasm_bindgen]
pub struct WasmBarChartData {
	pub vertex_array_general: WasmFloat32Array,
	pub colors_array_general: WasmFloat32Array,
	pub vertex_array_bars: WasmFloat32Array,
	pub colors_array_bars: WasmFloat32Array,
	pub relative_bar_positions: WasmFloat32Array,
}

#[wasm_bindgen]
pub struct BarChart {
	data: Vec<BarChartDataPoint>,
	start_timestamp: f64,
	width: u32,
	height: u32,
	background_color: Color,

	bars: Vec<BarData>,
	scale_lines: PreAllocatedCollection<ScaleLineObject>,

	bar_color: Color,
	bar_hover_color: Color,
	bar_selected_color: Color,

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

	value_axis_color: Color,

	hover_scale: f32,

	max_val: f32,

	is_animating: bool,
	selected_bar_index: Option<usize>,
	hovered_bar_index: Option<usize>,

	updated_data: bool,

	vertex_positions_general: PreAllocatedCollection<f32>,
	vertex_colors_general: PreAllocatedCollection<f32>,

	vertex_positions_bars: PreAllocatedCollection<f32>,
	vertex_colors_bars: PreAllocatedCollection<f32>,
	vertex_relative_bar_positions: PreAllocatedCollection<f32>,
}

fn handle_data(
	mut data: Vec<BarChartDataPoint>,
	old_bars: &[BarData],
	graph_height: u32,
	timestamp: f64,
) -> (Vec<BarChartDataPoint>, Vec<BarData>, f32) {
	let mut bars: Vec<BarData> = Vec::with_capacity(data.len());
	let mut max_val = 0.0;
	for data_point in &data {
		max_val = data_point.value.max(max_val);
	}

	for (index, data_point) in &mut data.iter_mut().enumerate() {
		let mut start_scale_t = 0.;
		let mut selected_state = SelectedState::None { timestamp };
		if index < old_bars.len() {
			let old_bar = &old_bars[index];
			start_scale_t = old_bar.height as f32 / graph_height as f32;
			selected_state = old_bar.selected_state;
		}

		bars.push(BarData {
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
			selected_state,
			start_scale_t,
			hover_anim: BarHoverAnimationData {
				timestamp,
				scale: AnimationStateData { from: 1.0, to: 1.0 },
			},
			clicking_state: ClickingState::None,
			clicking_bar_anim: ClickingBarAnimData {
				timestamp,
				color_t: AnimationStateData { from: 0., to: 0. },
			},
		});

		data_point.value /= max_val;
	}

	(data, bars, max_val)
}

#[wasm_bindgen]
impl BarChart {
	#[wasm_bindgen(constructor)]
	pub fn new(
		data: Vec<BarChartDataPoint>,
		start_timestamp: f64,
		width: u32,
		height: u32,
		layout: BarChartLayout,

		options: BarChartOptions,
	) -> BarChart {
		let max_scale_lines = 100;

		let scale_lines = PreAllocatedCollection::new(
			ScaleLineObject {
				x: 0,
				y: 0,
				width: 0,
				height: 0,
				intensity: 0,
				value: 0.0,
			},
			0,
			max_scale_lines,
		);

		let (data, bars, max_val) = handle_data(
			data,
			&[],
			height - layout.positioning.bottom - layout.positioning.top,
			start_timestamp,
		);

		let max_bars = options.bar_options.max_bars;

		let vertex_positions_general =
			PreAllocatedCollection::new(0., 0, max_scale_lines * VERTICES_PER_QUAD * 2);
		let vertex_colors_general =
			PreAllocatedCollection::new(0., 0, max_scale_lines * VERTICES_PER_QUAD * 4);

		let vertex_positions_bars =
			PreAllocatedCollection::new(0., 0, max_bars * VERTICES_PER_QUAD * 2);
		let vertex_colors_bars = PreAllocatedCollection::new(0., 0, max_bars * VERTICES_PER_QUAD * 4);
		let vertex_relative_bar_positions =
			PreAllocatedCollection::new(0., 0, max_bars * VERTICES_PER_QUAD * 4);

		BarChart {
			data,
			start_timestamp,
			width,
			height,
			background_color: options.background_color,
			bars,
			scale_lines,
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
			hover_scale: options.bar_options.hover_scale,
			max_val,
			is_animating: true,
			selected_bar_index: None,
			hovered_bar_index: None,
			bar_color: options.bar_options.color,
			bar_hover_color: options.bar_options.hover_color,
			bar_selected_color: options.bar_options.selected_color,
			value_axis_color: options.value_axis_color,
			updated_data: false,

			vertex_positions_general,
			vertex_colors_general,

			vertex_positions_bars,
			vertex_colors_bars,
			vertex_relative_bar_positions,
		}
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
	}

	pub fn update_data(&mut self, data: Vec<BarChartDataPoint>, timestamp: f64) {
		trace!(format!(
			"Updating data from {:#?} to {:#?}",
			self.data, data
		));
		let (data, bars, max_val) = handle_data(
			data,
			&self.bars,
			self.height - self.bottom - self.top,
			timestamp,
		);
		self.data = data;
		self.bars = bars;
		self.max_val = max_val;
		self.start_timestamp = timestamp;
		self.updated_data = true;
	}

	fn get_scale_line_vertex_positions(&mut self) {
		let positions = &mut self.vertex_positions_general;
		trace!(positions.len());
		for (i, scale_line) in self.scale_lines.into_iter().enumerate() {
			let vert_index = i * VERTICES_PER_QUAD * 2;

			let left = scale_line.x;
			let right = left + scale_line.width;
			let top = scale_line.y;
			let bottom = top + scale_line.height;

			let left = (left as f32 / self.width as f32) * 2. - 1.;
			let right = (right as f32 / self.width as f32) * 2. - 1.;
			let top = -((top as f32 / self.height as f32) * 2. - 1.);
			let bottom = -((bottom as f32 / self.height as f32) * 2. - 1.);

			positions[vert_index] = left;
			positions[vert_index + 1] = bottom;
			positions[vert_index + 2] = left;
			positions[vert_index + 3] = top;
			positions[vert_index + 4] = right;
			positions[vert_index + 5] = top;

			positions[vert_index + 6] = right;
			positions[vert_index + 7] = bottom;
			positions[vert_index + 8] = left;
			positions[vert_index + 9] = bottom;
			positions[vert_index + 10] = right;
			positions[vert_index + 11] = top;
		}
	}

	fn get_scale_line_vertex_colors(&mut self) {
		let colors = &mut self.vertex_colors_general;
		for (i, scale_line) in self.scale_lines.into_iter().enumerate() {
			let vert_index = i * VERTICES_PER_QUAD * 4;

			let color = self
				.background_color
				.lerp(&self.value_axis_color, scale_line.intensity as f32 / 255.);

			for offset in 0..VERTICES_PER_QUAD {
				let offset = offset * 4;
				colors[vert_index + offset] = color.r as f32 / 255.;
				colors[vert_index + offset + 1] = color.g as f32 / 255.;
				colors[vert_index + offset + 2] = color.b as f32 / 255.;
				colors[vert_index + offset + 3] = color.a as f32 / 255.;
			}
		}
	}

	fn get_bar_vertex_positions(&mut self) -> WasmFloat32Array {
		let positions = &mut self.vertex_positions_bars;
		positions.set_size(self.bars.len() * VERTICES_PER_QUAD * 2);

		for (i, bar) in self.bars.iter().enumerate() {
			let vert_index = i * VERTICES_PER_QUAD * 2;

			let width = (bar.width as f32 * bar.scale) as u32;
			let left_px = bar.x as f32 - (width as f32 - bar.width as f32) / 2.;

			// Convert pixel positions to (-1 to 1) scale
			let left = (left_px / self.width as f32) * 2. - 1.;
			let right = ((left_px + width as f32) / self.width as f32) * 2. - 1.;
			let bottom = -(((bar.y as f32 + bar.height as f32) / self.height as f32) * 2. - 1.);
			let top = -((bar.y as f32 / self.height as f32) * 2. - 1.);

			// Every two indices is an x and a y position. Two triangles per loop.
			positions[vert_index] = left;
			positions[vert_index + 1] = bottom;
			positions[vert_index + 2] = left;
			positions[vert_index + 3] = top;
			positions[vert_index + 4] = right;
			positions[vert_index + 5] = top;

			positions[vert_index + 6] = right;
			positions[vert_index + 7] = bottom;
			positions[vert_index + 8] = left;
			positions[vert_index + 9] = bottom;
			positions[vert_index + 10] = right;
			positions[vert_index + 11] = top;
		}

		positions.into()
	}

	fn get_relative_bar_vertex_positions(&mut self) -> WasmFloat32Array {
		let positions = &mut self.vertex_relative_bar_positions;
		positions.set_size(self.bars.len() * VERTICES_PER_QUAD * 4);

		for (i, bar) in self.bars.iter().enumerate() {
			let vert_index = i * VERTICES_PER_QUAD * 4;

			let bar_width = bar.width as f32;
			let bar_height = bar.height as f32;

			/*
			0: relative width of nth vertex
			1: relative height of nth vertex
			2: pixel width of bar
			3: pixel height of bar
			4: ...
			*/
			positions[vert_index] = 0.;
			positions[vert_index + 1] = 0.;
			positions[vert_index + 2] = bar_width;
			positions[vert_index + 3] = bar_height;

			positions[vert_index + 4] = 0.;
			positions[vert_index + 5] = 1.;
			positions[vert_index + 6] = bar_width;
			positions[vert_index + 7] = bar_height;

			positions[vert_index + 8] = 1.;
			positions[vert_index + 9] = 1.;
			positions[vert_index + 10] = bar_width;
			positions[vert_index + 11] = bar_height;

			positions[vert_index + 12] = 1.;
			positions[vert_index + 13] = 0.;
			positions[vert_index + 14] = bar_width;
			positions[vert_index + 15] = bar_height;

			positions[vert_index + 16] = 0.;
			positions[vert_index + 17] = 0.;
			positions[vert_index + 18] = bar_width;
			positions[vert_index + 19] = bar_height;

			positions[vert_index + 20] = 1.;
			positions[vert_index + 21] = 1.;
			positions[vert_index + 22] = bar_width;
			positions[vert_index + 23] = bar_height;
		}

		positions.into()
	}

	fn get_bar_vertex_colors(&mut self) -> WasmFloat32Array {
		let colors = &mut self.vertex_colors_bars;
		colors.set_size(self.bars.len() * VERTICES_PER_QUAD * 4);

		for (i, bar) in self.bars.iter().enumerate() {
			let vert_index = i * VERTICES_PER_QUAD * 4;

			let color = bar.color;

			for offset in 0..VERTICES_PER_QUAD {
				let offset = offset * 4;
				colors[vert_index + offset] = color.r as f32 / 255.;
				colors[vert_index + offset + 1] = color.g as f32 / 255.;
				colors[vert_index + offset + 2] = color.b as f32 / 255.;
				colors[vert_index + offset + 3] = color.a as f32 / 255.;
			}
		}

		colors.into()
	}

	fn get_general_vertex_positions(&mut self) -> WasmFloat32Array {
		trace!("get_general_vertex_positions");

		self
			.vertex_positions_general
			.set_size(self.scale_lines.len() * VERTICES_PER_QUAD * 2);

		self.get_scale_line_vertex_positions();

		(&self.vertex_positions_general).into()
	}

	fn get_general_vertex_colors(&mut self) -> WasmFloat32Array {
		trace!("get_general_vertex_colors");

		self
			.vertex_colors_general
			.set_size(self.scale_lines.len() * VERTICES_PER_QUAD * 4);

		self.get_scale_line_vertex_colors();

		(&self.vertex_colors_general).into()
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

	pub fn get_scale_lines_count(&self) -> usize {
		self.scale_lines.len()
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

	pub fn get_hovered_bar_index(&self) -> Option<usize> {
		self.hovered_bar_index
	}

	pub fn get_corner_radius(&self) -> u32 {
		let first_bar = self.bars.first();
		if let Some(first_bar) = first_bar {
			min(self.bar_corner_radius, first_bar.width / 2)
		} else {
			0
		}
	}

	fn toggle_bar_selection_at(&mut self, index: usize, timestamp: f64) {
		for i in 0..self.bars.len() {
			let selected = i == index;

			if selected {
				if let SelectedState::Selected { timestamp: _ } = self.bars[i].selected_state {
					trace!("Deselect bar", i);
					self.bars[i].selected_state = SelectedState::None { timestamp };
					self.selected_bar_index = None;
				} else {
					trace!("Select bar", i);
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
				trace!("Deselect bar", i);
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
		trace!("calculate_bars");
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
		self.hovered_bar_index = None;

		let height_animation_delay = 800.
			/ if bars_count == 0 {
				1.
			} else {
				bars_count as f64
			};

		for bar_index in 0..bars_count {
			let bar = &mut self.bars[bar_index];

			let anim_data = BarHeightAnimData {
				timestamp: self.start_timestamp,
				scale_t: AnimationStateData { from: 0.0, to: 1.0 },
			};
			let animation = Animation::new(
				&anim_data,
				timestamp,
				500.0,
				height_animation_delay * bar_index as f64,
			);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			let x_pos = (bar_index as f32 * base_width + left as f32).to_u32();
			let width = unclamped_width.max(self.min_width as f32).to_u32();

			let scale_t = animation.get_current().scale_t;
			let full_height = max(
				(height as f32 * self.data[bar_index].value).to_u32(),
				self.min_height,
			) as f32;
			let height = lerp(bar.start_scale_t * height as f32, full_height, scale_t).to_u32();
			let y_pos = (self.height as i32 - bottom as i32 - height as i32).to_u32();

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
				self.hovered_bar_index = Some(bar_index);

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
									to: self.bar_hover_color.a as f32 / 255.,
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

						self.toggle_bar_selection_at(bar_index, timestamp);
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

			let bar = &mut self.bars[bar_index];

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

			bar.color = self
				.bar_color
				.lerp(&self.bar_selected_color, animation.get_current().color_t);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			let animation = Animation::new(&bar.clicking_bar_anim, timestamp, 200.0, 0.0);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			bar.color_t = animation.get_current().color_t;

			bar.color = bar.color.lerp(&self.bar_hover_color, bar.color_t);
		}

		if matches!(clicking_state, ClickingState::JustReleased) && !any_bar_was_clicked {
			self.deselect_bars(timestamp);
			all_animations_done = false;
		}

		self.is_animating = !all_animations_done;
	}

	fn calculate_scale_lines(&mut self) {
		trace!("calculate_scale_lines");
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

		if pixel_distance < 1. {
			log_warn!("pixel_distance < 1");
			return;
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
			scale_line.intensity = if modu == 0 { 100 } else { 50 };
			scale_line.value = value;
		}

		let scale_line = &mut self.scale_lines[0];
		scale_line.x = x_offset;
		scale_line.y = self.top;
		scale_line.width = (self.width as i32 - x_offset as i32).to_u32();
		scale_line.height = thickness;
		scale_line.intensity = 255;
		scale_line.value = self.max_val;

		let scale_line = &mut self.scale_lines[success_line_count as usize];
		scale_line.x = x_offset;
		scale_line.y = (self.height as i32 - self.bottom as i32 - thickness as i32).to_u32();
		scale_line.width = (self.width as i32 - x_offset as i32).to_u32();
		scale_line.height = thickness;
		scale_line.intensity = 200;
		scale_line.value = 0.0;

		self
			.scale_lines
			.set_size(usize::try_from(success_line_count).unwrap_or(usize::MAX - 1) + 1);
	}

	pub fn update(
		&mut self,
		timestamp: f64,
		pointer_x: Option<u32>,
		pointer_y: Option<u32>,
		clicking_state: ClickingState,
	) -> WasmBarChartData {
		trace!("update");

		self.calculate_scale_lines();
		self.calculate_bars(timestamp, pointer_x, pointer_y, clicking_state);

		let vertex_array_general = self.get_general_vertex_positions();
		let colors_array_general = self.get_general_vertex_colors();
		let vertex_array_bars = self.get_bar_vertex_positions();
		let colors_array_bars = self.get_bar_vertex_colors();
		let relative_bar_positions = self.get_relative_bar_vertex_positions();

		if self.updated_data {
			self.is_animating = true;
			self.updated_data = false;
		}

		WasmBarChartData {
			vertex_array_general,
			colors_array_general,
			vertex_array_bars,
			colors_array_bars,
			relative_bar_positions,
		}
	}
}
