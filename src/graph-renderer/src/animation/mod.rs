use std::f64::consts::PI;

pub struct Animation {
	timestamp: f64,
	animation_time: f64,

	start_state: f32,
	end_state: f32,
}

impl Animation {
	pub fn new(
		current_timestamp: f64,
		start_timestamp: f64,
		animation_time: f64,
		delay: f64,
		start_state: f32,
		end_state: f32,
	) -> Self {
		Self {
			timestamp: current_timestamp - start_timestamp - delay,
			animation_time,
			start_state,
			end_state,
		}
	}

	pub fn get_current(&self) -> f32 {
		if self.is_completed() {
			return self.end_state;
		}

		let ratio = self.timestamp / self.animation_time;
		ease_out_sine(ratio) * (self.end_state - self.start_state) + self.start_state
	}

	pub fn is_completed(&self) -> bool {
		self.timestamp > self.animation_time
	}
}

fn ease_out_sine(x: f64) -> f32 {
	((x * PI) / 2.0).sin() as f32
}
