#![allow(unused)] // This line must be at the very top of the file

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
	#[wasm_bindgen(js_namespace = console)]
	fn log(s: &str);

	#[wasm_bindgen(js_namespace = console, js_name = error)]
	fn log_info(s: &str);

	#[wasm_bindgen(js_namespace = console, js_name = debug)]
	fn log_debug(s: &str);

	#[wasm_bindgen(js_namespace = console, js_name = error)]
	fn log_error(s: &str);

	#[wasm_bindgen(js_namespace = console, js_name = warn)]
	fn log_warn(s: &str);
}

// Log
pub trait Log {
	fn log(&self);
}

impl Log for &str {
	fn log(&self) {
		log(self);
	}
}

impl Log for String {
	fn log(&self) {
		log(self);
	}
}

// Info
pub trait LogInfo {
	fn log_info(&self);
}

impl LogInfo for &str {
	fn log_info(&self) {
		log_info(self);
	}
}

impl LogInfo for String {
	fn log_info(&self) {
		log_info(self);
	}
}

// Debug
pub trait LogDebug {
	fn log_debug(&self);
}

impl LogDebug for &str {
	fn log_debug(&self) {
		log_debug(self);
	}
}

impl LogDebug for String {
	fn log_debug(&self) {
		log_debug(self);
	}
}

// Error
pub trait LogError {
	fn log_error(&self);
}

impl LogError for &str {
	fn log_error(&self) {
		log_error(self);
	}
}

impl LogError for String {
	fn log_error(&self) {
		log_error(self);
	}
}

// Warn
pub trait LogWarn {
	fn log_warn(&self);
}

impl LogWarn for &str {
	fn log_warn(&self) {
		log_warn(self);
	}
}

impl LogWarn for String {
	fn log_warn(&self) {
		log_warn(self);
	}
}
