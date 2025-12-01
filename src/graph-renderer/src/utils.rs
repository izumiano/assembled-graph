use std::cmp::max;

pub trait NumUtils {
	fn to_u32(&self) -> u32;
	fn ceil_nearest_power_2(&self) -> f32;
}
impl NumUtils for f32 {
	fn to_u32(&self) -> u32 {
		self.max(0.0) as u32
	}
	fn ceil_nearest_power_2(&self) -> f32 {
		let log_val = self.log2();

		let rounded_log = log_val.ceil();

		let result = 2.0f32.powf(rounded_log);
		return result;
	}
}
impl NumUtils for i32 {
	fn to_u32(&self) -> u32 {
		max(*self, 0) as u32
	}
	fn ceil_nearest_power_2(&self) -> f32 {
		(*self as f32).ceil_nearest_power_2()
	}
}
