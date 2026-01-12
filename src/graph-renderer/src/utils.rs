use std::cmp::max;

pub trait NumUtils {
	fn to_u32(&self) -> u32;
	fn to_u8(&self) -> u8;
	fn ceil_nearest_power_2(&self) -> f32;
}

impl NumUtils for f32 {
	fn to_u32(&self) -> u32 {
		self.max(0.0) as u32
	}
	fn to_u8(&self) -> u8 {
		self.max(0.0) as u8
	}
	fn ceil_nearest_power_2(&self) -> f32 {
		let log_val = self.log2();

		let rounded_log = log_val.ceil();

		2.0f32.powf(rounded_log)
	}
}
impl NumUtils for i32 {
	fn to_u32(&self) -> u32 {
		max(*self, 0) as u32
	}
	fn to_u8(&self) -> u8 {
		max(*self, 0) as u8
	}
	fn ceil_nearest_power_2(&self) -> f32 {
		(*self as f32).ceil_nearest_power_2()
	}
}

pub fn lerp(a: f32, b: f32, t: f32) -> f32 {
	t * (b - a) + a
}
