use std::f64::consts::PI;

pub trait AnimationData<T> {
	fn get_timestamp(&self) -> f64;
	fn get_start_state(&self) -> T;
	fn get_end_state(&self) -> T;
	fn get_current(&self, ratio: f32) -> T;
}

pub struct Animation<'a, T> {
	anim_data: &'a dyn AnimationData<T>,

	timestamp: f64,
	animation_time: f64,
}

impl<'a, T> Animation<'a, T> {
	pub fn new(
		anim_data: &'a impl AnimationData<T>,
		current_timestamp: f64,
		animation_time: f64,
		delay: f64,
	) -> Self {
		Self {
			anim_data,
			timestamp: current_timestamp - anim_data.get_timestamp() - delay,
			animation_time,
		}
	}

	pub fn get_current(&self) -> T {
		if self.is_completed() {
			return self.anim_data.get_end_state();
		}

		if self.timestamp < 0. {
			return self.anim_data.get_start_state();
		}

		let ratio = self.timestamp / self.animation_time;

		self.anim_data.get_current(ease_out_sine(ratio))
	}

	pub fn is_completed(&self) -> bool {
		self.timestamp > self.animation_time
	}
}

pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
	t * (b - a) + a
}

fn ease_out_sine(x: f64) -> f32 {
	((x * PI) / 2.0).sin() as f32
}

#[derive(Debug)]
pub struct AnimationStateData {
	pub from: f32,
	pub to: f32,
}

#[macro_export]
macro_rules! DefineAnimation {
	($name:ident, $name2:ident, $($field_name:ident),*) => {
		#[derive(Debug)]
		struct $name {
			timestamp: f64,
			$($field_name: AnimationStateData),*
		}

		#[derive(Debug)]
		struct $name2 {
			$($field_name: f32),*
		}

		impl AnimationData<$name2> for $name {
			fn get_timestamp(&self) -> f64 {
				self.timestamp
			}

			fn get_start_state(&self) -> $name2 {
				$name2 {
					$($field_name: self.$field_name.from),*
				}
			}

			fn get_end_state(&self) -> $name2 {
				$name2 {
					$($field_name: self.$field_name.to),*
				}
			}

			fn get_current(&self, ratio: f32) -> $name2 {
				let start_state = self.get_start_state();
				let end_state = self.get_end_state();
				// $name2 {
				// 	$($field_name: ratio * (end_state.$field_name - start_state.$field_name)
				// 		+ start_state.$field_name),*
				// }
				$name2 {
					$($field_name: lerp(start_state.$field_name, end_state.$field_name, ratio)),*
				}
			}
		}
	};
}
