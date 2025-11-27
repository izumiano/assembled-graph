use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct CanvasPixels {
	pixels: Vec<u8>,
	width: usize,
	height: usize,
}

#[wasm_bindgen]
impl CanvasPixels {
	#[wasm_bindgen(constructor)]
	pub fn new(width: usize, height: usize) -> CanvasPixels {
		let size = width * height * 4;
		let pixels = vec![0; size];
		CanvasPixels {
			pixels,
			width,
			height,
		}
	}

	pub fn pixels_ptr(&self) -> *const u8 {
		self.pixels.as_ptr()
	}

	pub fn get_width(&self) -> usize {
		self.width
	}

	pub fn get_height(&self) -> usize {
		self.height
	}

	pub fn resize(&mut self, width: usize, height: usize) {
		self.width = width;
		self.height = height;
		let size = width * height * 4;
		self.pixels = vec![0; size];
	}

	pub fn update_pixels(&mut self, timestamp: u32) {
		for y in 0..self.height {
			for x in 0..self.width {
				let i = (y * self.width + x) * 4;
				self.pixels[i] = if ((x as f32 / self.width as f32 * 255 as f32)
					- (y as f32 / self.height as f32 * 255 as f32))
					.abs()
					< ((timestamp as f32 / 1000.0).sin() * 200.0).abs()
				{
					255
				} else {
					0
				}; // Red
				self.pixels[i + 1] = 0; // Green
				self.pixels[i + 2] = 0; // Blue
				self.pixels[i + 3] = 255; // Alpha
			}
		}
	}
}
