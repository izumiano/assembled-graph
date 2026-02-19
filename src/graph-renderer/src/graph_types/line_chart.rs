use proc_macros::wasm_struct;
use std::cmp::max;
use std::cmp::min;
use wasm_bindgen::prelude::wasm_bindgen;

use crate::animation::Animation;
use crate::animation::AnimationStateData;
use crate::animation::*;
use crate::graph_types::shared::consts::VERTICES_PER_QUAD;
use crate::graph_types::shared::types::ValueAxisLayout;
use crate::graph_types::shared::types::{
	PointerState, Positioning, ScaleLineObject, SelectedState,
};
use crate::graph_types::utils::Color;
use crate::utils::NumUtils;
use crate::utils::PreAllocatedCollection;
use crate::utils::lerp;
use crate::{DefineAnimation, log_warn, trace};
use crate::{graph_types::shared::types::ClickingState, utils::WasmFloat32Array};

DefineAnimation!(PointHoverAnimationData, CurrentPointHoverAnimData, scale);
DefineAnimation!(ClickingPointAnimData, CurrentClickingPointAnimData, color_t);
DefineAnimation!(SelectPointAnimData, CurrentSelectPointAnimData, color_t);

#[wasm_bindgen]
pub struct WasmLineChartData {
	pub vertex_array_general: WasmFloat32Array,
	pub colors_array_general: WasmFloat32Array,
	pub vertex_array_points: WasmFloat32Array,
	pub colors_array_points: WasmFloat32Array,
}

#[wasm_struct]
pub struct LineChartDataPoint {
	x: f32,
	y: f32,
}

#[derive(Debug)]
struct PointData {
	x: u32,
	y: u32,
	scale: f32,
	color_t: f32,
	color: Color,
	pointer_state: PointerState,
	selected_state: SelectedState,

	start_scale_t: f32,
	hover_anim: PointHoverAnimationData,
	clicking_state: ClickingState,
	clicking_point_anim: ClickingPointAnimData,
}

#[wasm_struct]
pub struct PointLayout {
	radius: u32,
}

#[wasm_struct]
pub struct LineChartLayout {
	positioning: Positioning,

	point_layout: PointLayout,
	value_axis_layout: ValueAxisLayout,
}

#[wasm_struct]
pub struct PointOptions {
	color: Color,
	hover_color: Color,
	selected_color: Color,
	hover_scale: f32,
	max_points: usize,
}

#[wasm_struct]
pub struct LineChartOptions {
	background_color: Color,
	point_options: PointOptions,
	value_axis_color: Color,
}

#[wasm_bindgen]
pub struct LineChart {
	data: Vec<LineChartDataPoint>,
	start_timestamp: f64,
	width: u32,
	height: u32,
	background_color: Color,

	points: Vec<PointData>,
	scale_lines: PreAllocatedCollection<ScaleLineObject>,

	point_color: Color,
	point_hover_color: Color,
	point_selected_color: Color,

	bottom: u32,
	top: u32,
	left: u32,
	right: u32,

	point_radius: u32,

	value_axis_width: u32,
	value_axis_smallest_scale: f32,
	value_axis_min_pixel_distance: u32,

	value_axis_color: Color,

	hover_scale: f32,

	min_x: f32,
	max_x: f32,
	max_y: f32,

	is_animating: bool,
	selected_point_index: Option<usize>,
	hovered_point_index: Option<usize>,

	updated_data: bool,

	vertex_positions_general: PreAllocatedCollection<f32>,
	vertex_colors_general: PreAllocatedCollection<f32>,
	vertex_positions_points: PreAllocatedCollection<f32>,
	vertex_colors_points: PreAllocatedCollection<f32>,
}

fn handle_data(
	mut data: Vec<LineChartDataPoint>,
	old_points: &[PointData],
	graph_height: u32,
	timestamp: f64,
) -> (Vec<LineChartDataPoint>, Vec<PointData>, f32, f32, f32) {
	let mut points: Vec<PointData> = Vec::with_capacity(data.len());
	let mut min_x = 0.;
	let mut max_x = 0.;
	let mut max_y = 0.;
	for data_point in &data {
		min_x = data_point.x.min(min_x);
		max_x = data_point.x.max(max_x);
		max_y = data_point.y.max(max_y);
	}

	trace!("handle_data", min_x, max_x, max_y);

	for (index, data_point) in &mut data.iter_mut().enumerate() {
		let mut start_scale_t = 0.;
		let mut selected_state = SelectedState::None { timestamp };
		// if index < old_points.len() {
		// 	let old_bar = &old_points[index];
		// 	start_scale_t = old_bar.height as f32 / graph_height as f32;
		// 	selected_state = old_bar.selected_state;
		// }

		points.push(PointData {
			x: 0,
			y: 0,
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
			hover_anim: PointHoverAnimationData {
				timestamp,
				scale: AnimationStateData { from: 1.0, to: 1.0 },
			},
			clicking_state: ClickingState::None,
			clicking_point_anim: ClickingPointAnimData {
				timestamp,
				color_t: AnimationStateData { from: 0., to: 0. },
			},
		});

		data_point.x /= max_x - min_x;
		data_point.y /= max_y;
	}

	(data, points, min_x, max_x, max_y)
}

#[wasm_bindgen]
impl LineChart {
	#[wasm_bindgen(constructor)]
	pub fn new(
		data: Vec<LineChartDataPoint>,
		start_timestamp: f64,
		width: u32,
		height: u32,
		layout: LineChartLayout,

		options: LineChartOptions,
	) -> Self {
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

		let (data, points, min_x, max_x, max_y) = handle_data(
			data,
			&[],
			height - layout.positioning.bottom - layout.positioning.top,
			start_timestamp,
		);

		let max_points = options.point_options.max_points;

		let vertex_positions_general =
			PreAllocatedCollection::new(0., 0, max_scale_lines * VERTICES_PER_QUAD * 2);
		let vertex_colors_general =
			PreAllocatedCollection::new(0., 0, max_scale_lines * VERTICES_PER_QUAD * 4);

		let vertex_positions_points =
			PreAllocatedCollection::new(0., 0, max_points * VERTICES_PER_QUAD * 2);
		let vertex_colors_points =
			PreAllocatedCollection::new(0., 0, max_points * VERTICES_PER_QUAD * 4);

		Self {
			data,
			start_timestamp,
			width,
			height,
			background_color: options.background_color,
			points,
			scale_lines,
			bottom: layout.positioning.bottom,
			top: layout.positioning.top,
			left: layout.positioning.left,
			right: layout.positioning.right,
			point_radius: layout.point_layout.radius,
			value_axis_width: layout.value_axis_layout.value_axis_width,
			value_axis_smallest_scale: layout.value_axis_layout.value_axis_smallest_scale,
			value_axis_min_pixel_distance: layout.value_axis_layout.value_axis_min_pixel_distance,
			hover_scale: options.point_options.hover_scale,
			min_x,
			max_x,
			max_y,
			is_animating: true,
			selected_point_index: None,
			hovered_point_index: None,
			point_color: options.point_options.color,
			point_hover_color: options.point_options.hover_color,
			point_selected_color: options.point_options.selected_color,
			value_axis_color: options.value_axis_color,
			updated_data: false,

			vertex_positions_general,
			vertex_colors_general,
			vertex_positions_points,
			vertex_colors_points,
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

	pub fn update_data(&mut self, data: Vec<LineChartDataPoint>, timestamp: f64) {
		trace!(format!(
			"Updating data from {:#?} to {:#?}",
			self.data, data
		));
		let (data, points, min_x, max_x, max_y) = handle_data(
			data,
			&self.points,
			self.height - self.bottom - self.top,
			timestamp,
		);
		self.data = data;
		self.points = points;
		self.min_x = min_x;
		self.max_x = max_x;
		self.max_y = max_y;
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

	fn get_points_vertex_positions(&mut self) -> WasmFloat32Array {
		let positions = &mut self.vertex_positions_points;
		positions.set_size(self.points.len() * VERTICES_PER_QUAD * 2);

		for (i, point) in self.points.iter().enumerate() {
			let vert_index = i * VERTICES_PER_QUAD * 2;

			let width = (10 as f32 * point.scale) as u32; // TODO
			let left_px = point.x as f32 - (width as f32 - 10 as f32) / 2.;

			// Convert pixel positions to (-1 to 1) scale
			let left = (left_px / self.width as f32) * 2. - 1.;
			let right = ((left_px + width as f32) / self.width as f32) * 2. - 1.;
			let bottom = -(((point.y as f32 + 10 as f32) / self.height as f32) * 2. - 1.); // TODO
			let top = -((point.y as f32 / self.height as f32) * 2. - 1.);

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

	fn get_points_vertex_colors(&mut self) -> WasmFloat32Array {
		let colors = &mut self.vertex_colors_points;
		colors.set_size(self.points.len() * VERTICES_PER_QUAD * 4);

		for (i, point) in self.points.iter().enumerate() {
			let vert_index = i * VERTICES_PER_QUAD * 4;

			let color = point.color;

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

	pub fn get_points_len(&self) -> usize {
		self.points.len()
	}

	pub fn get_point_x_at(&self, index: usize) -> u32 {
		self.points[index].x
	}

	pub fn get_point_y_at(&self, index: usize) -> u32 {
		self.points[index].y
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

	pub fn get_selected_point_index(&self) -> Option<usize> {
		self.selected_point_index
	}

	pub fn get_hovered_point_index(&self) -> Option<usize> {
		self.hovered_point_index
	}

	fn toggle_point_selection_at(&mut self, index: usize, timestamp: f64) {
		for i in 0..self.points.len() {
			let selected = i == index;

			if selected {
				if let SelectedState::Selected { timestamp: _ } = self.points[i].selected_state {
					trace!("Deselect point", i);
					self.points[i].selected_state = SelectedState::None { timestamp };
					self.selected_point_index = None;
				} else {
					trace!("Select point", i);
					self.points[i].selected_state = SelectedState::Selected { timestamp };
					self.selected_point_index = Some(index);
				}
			} else if let SelectedState::None { timestamp: _ } = self.points[i].selected_state {
			} else {
				self.points[i].selected_state = SelectedState::None { timestamp };
			}
		}
	}

	fn deselect_points(&mut self, timestamp: f64) {
		for i in 0..self.points.len() {
			let selected = matches!(
				self.points[i].selected_state,
				SelectedState::Selected { timestamp: _ }
			);

			if selected {
				trace!("Deselect point", i);
				self.points[i].selected_state = SelectedState::None { timestamp };
			}
		}
		self.selected_point_index = None;
	}

	fn calculate_points(
		&mut self,
		timestamp: f64,
		pointer_x: Option<u32>,
		pointer_y: Option<u32>,
		clicking_state: ClickingState,
	) {
		trace!("calculate_points");
		let points_count = self.data.len();

		let mut left = self.left + self.value_axis_width;

		let bottom = self.bottom;

		let width = self.width as i32 - left as i32 - self.right as i32;
		let height = self.height as i32 - self.top as i32 - bottom as i32;

		let mut all_animations_done = true;
		let mut any_point_was_clicked = false;
		self.hovered_point_index = None;

		for point_index in 0..points_count {
			let point = &mut self.points[point_index];

			let x_pos = (point_index as f32 * 20. + left as f32).to_u32(); // TODO: calculate x pos based on data
			let x_pos = (self.data[point_index].x * width as f32).to_u32() + left;

			let height = (height as f32 * self.data[point_index].y).to_u32();
			let y_pos = (self.height as i32 - bottom as i32 - height as i32).to_u32();

			point.x = x_pos;
			point.y = y_pos;

			if let Some(pointer_x) = pointer_x
				&& let Some(pointer_y) = pointer_y
				&& pointer_x >= x_pos
				&& pointer_x <= x_pos + self.point_radius
				&& pointer_y >= y_pos
				&& pointer_y <= y_pos + self.point_radius
			{
				self.hovered_point_index = Some(point_index);

				if let PointerState::Hover = point.pointer_state {
				} else {
					point.pointer_state = PointerState::Hover;
					point.hover_anim = PointHoverAnimationData {
						timestamp,
						scale: AnimationStateData {
							from: point.scale,
							to: self.hover_scale,
						},
					};
				}

				match clicking_state {
					ClickingState::Holding => {
						if let ClickingState::Holding = point.clicking_state {
						} else {
							point.clicking_point_anim = ClickingPointAnimData {
								timestamp,
								color_t: AnimationStateData {
									from: point.color_t,
									to: self.point_hover_color.a as f32 / 255.,
								},
							};
							point.clicking_state = ClickingState::Holding;
						}
					}
					ClickingState::JustReleased => {
						point.clicking_point_anim = ClickingPointAnimData {
							timestamp,
							color_t: AnimationStateData {
								from: point.color_t,
								to: 0.,
							},
						};
						point.clicking_state = ClickingState::JustReleased;

						self.toggle_point_selection_at(point_index, timestamp);
						any_point_was_clicked = true;
					}
					_ => {}
				}
			} else if let PointerState::None = point.pointer_state {
			} else {
				point.pointer_state = PointerState::None;

				point.hover_anim = PointHoverAnimationData {
					timestamp,
					scale: AnimationStateData {
						from: point.scale,
						to: 1.0,
					},
				};
				point.clicking_point_anim = ClickingPointAnimData {
					timestamp,
					color_t: AnimationStateData {
						from: point.color_t,
						to: 0.,
					},
				};
				point.clicking_state = ClickingState::None;
			}

			let point = &mut self.points[point_index];

			let animation = Animation::new(&point.hover_anim, timestamp, 200.0, 0.0);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			point.scale = animation.get_current().scale;

			let anim_data = SelectPointAnimData {
				color_t: match point.selected_state {
					SelectedState::None { timestamp: _ } => AnimationStateData { from: 1., to: 0. },
					SelectedState::Selected { timestamp: _ } => AnimationStateData { from: 0., to: 1. },
				},
				timestamp: point.selected_state.get_timestamp(),
			};
			let animation = Animation::new(&anim_data, timestamp, 200.0, 0.0);

			point.color = self
				.point_color
				.lerp(&self.point_selected_color, animation.get_current().color_t);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			let animation = Animation::new(&point.clicking_point_anim, timestamp, 200.0, 0.0);

			if !animation.is_completed() {
				all_animations_done = false;
			}

			point.color_t = animation.get_current().color_t;

			point.color = point.color.lerp(&self.point_hover_color, point.color_t);
		}

		if matches!(clicking_state, ClickingState::JustReleased) && !any_point_was_clicked {
			self.deselect_points(timestamp);
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
		let mut pixel_distance = (smallest_scale / self.max_y) * height;

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

			let value = ratio * self.max_y;

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
		scale_line.value = self.max_y;

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
	) -> WasmLineChartData {
		trace!("update");

		self.calculate_scale_lines();
		self.calculate_points(timestamp, pointer_x, pointer_y, clicking_state);

		let vertex_array_general = self.get_general_vertex_positions();
		let colors_array_general = self.get_general_vertex_colors();
		let vertex_array_points = self.get_points_vertex_positions();
		let colors_array_points = self.get_points_vertex_colors();

		if self.updated_data {
			self.is_animating = true;
			self.updated_data = false;
		}

		WasmLineChartData {
			vertex_array_general,
			colors_array_general,
			vertex_array_points,
			colors_array_points,
		}
	}
}
