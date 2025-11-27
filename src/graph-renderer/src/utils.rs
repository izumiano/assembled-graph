use std::cmp::max;

pub trait NumUtils {
	fn to_u32(&self) -> u32;
}
impl NumUtils for f32 {
	fn to_u32(&self) -> u32 {
		self.max(0.0) as u32
	}
}
impl NumUtils for i32 {
	fn to_u32(&self) -> u32 {
		max(*self, 0) as u32
	}
}
