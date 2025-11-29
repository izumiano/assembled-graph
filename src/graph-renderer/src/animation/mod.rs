use std::f64::consts::PI;

pub struct Animation {
	pub start_timestamp: f64,
	pub animation_time: f64,
	pub delay: f64,

	pub start_state: f32,
	pub end_state: f32,
}

impl Animation {
	pub fn get_current(&self, timestamp: f64) -> f32 {
		if timestamp > self.start_timestamp + self.animation_time + self.delay {
			return self.end_state;
		}

		let current_time = timestamp - self.start_timestamp - self.delay;

		let ratio = current_time / self.animation_time;
		ease_out_sine(ratio) * (self.end_state - self.start_state) + self.start_state
	}
}

fn ease_out_sine(x: f64) -> f32 {
	((x * PI) / 2.0).sin() as f32
}
