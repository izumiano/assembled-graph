use std::{
	cmp::max,
	ops::{Index, IndexMut},
	slice::SliceIndex,
};

use wasm_bindgen::prelude::wasm_bindgen;

use crate::wasm_assert;

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

pub struct PreAllocatedCollection<T> {
	data: Box<[T]>,
	size: usize,
}

impl<T> PreAllocatedCollection<T>
where
	T: Clone,
{
	pub fn new(initial: T, size: usize, capacity: usize) -> Self {
		Self {
			data: vec![initial; capacity].into_boxed_slice(),
			size,
		}
	}

	pub fn len(&self) -> usize {
		self.size
	}

	pub fn set_size(&mut self, size: usize) {
		wasm_assert!(
			size <= self.data.len(),
			"size={size} data.len={}",
			self.data.len()
		);

		self.size = size;
	}

	pub fn get_data(&self) -> &[T] {
		&self.data
	}

	pub fn get_data_mut(&mut self) -> &mut [T] {
		&mut self.data
	}
}

impl<'a, T> IntoIterator for &'a PreAllocatedCollection<T> {
	type Item = &'a T;

	type IntoIter = std::slice::Iter<'a, T>;

	fn into_iter(self) -> Self::IntoIter {
		self.data[..self.size].iter()
	}
}

impl<'a, T> IntoIterator for &'a mut PreAllocatedCollection<T> {
	type Item = &'a mut T;

	type IntoIter = std::slice::IterMut<'a, T>;

	fn into_iter(self) -> Self::IntoIter {
		self.data[..self.size].iter_mut()
	}
}

impl<T, Idx> IndexMut<Idx> for PreAllocatedCollection<T>
where
	Idx: SliceIndex<[T], Output = T>,
{
	#[inline(always)]
	fn index_mut(&mut self, index: Idx) -> &mut Self::Output {
		self.data.index_mut(index)
	}
}

impl<T, Idx> Index<Idx> for PreAllocatedCollection<T>
where
	Idx: SliceIndex<[T], Output = T>,
{
	type Output = T;

	#[inline(always)]
	fn index(&self, index: Idx) -> &Self::Output {
		self.data.index(index)
	}
}

#[wasm_bindgen]
pub struct WasmFloat32Array {
	pub pointer: *const f32,
	pub size: usize,
}

impl From<PreAllocatedCollection<f32>> for WasmFloat32Array {
	fn from(value: PreAllocatedCollection<f32>) -> Self {
		Self {
			pointer: value.get_data().as_ptr(),
			size: value.len(),
		}
	}
}

impl From<&PreAllocatedCollection<f32>> for WasmFloat32Array {
	fn from(value: &PreAllocatedCollection<f32>) -> Self {
		Self {
			pointer: value.get_data().as_ptr(),
			size: value.len(),
		}
	}
}

impl From<&mut PreAllocatedCollection<f32>> for WasmFloat32Array {
	fn from(value: &mut PreAllocatedCollection<f32>) -> Self {
		Self {
			pointer: value.get_data().as_ptr(),
			size: value.len(),
		}
	}
}
