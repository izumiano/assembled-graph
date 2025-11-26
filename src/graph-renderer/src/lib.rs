use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
	#[wasm_bindgen(js_namespace = console)]
	fn log(s: &str);

	#[wasm_bindgen(js_namespace = console, js_name = log)]
	fn log_u32(a: u32);
}

#[wasm_bindgen]
pub fn get_array(width: usize, height: usize, timestamp: u32, mut arr: Vec<u8>) -> Vec<u8> {
	for y in 0..height {
		for x in 0..width {
			let i = (y * width + x) * 4;
			arr[i] = if ((x - y) as i32).abs() < ((timestamp as f32 / 1000.0).sin() * 200.0).abs() as i32
			{
				255
			} else {
				0
			}; // Red
			arr[i + 1] = 0; // Green
			arr[i + 2] = 0; // Blue
			arr[i + 3] = 255; // Alpha
		}
	}
	return arr;
}
