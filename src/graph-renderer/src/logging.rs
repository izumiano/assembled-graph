#![allow(unused)]

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

#[macro_export]
macro_rules! log_format {
	($title:literal, $($var:expr),*) => {{
		#[cfg(debug_assertions)]{
			let mut message = String::from("");
			$(
				message += &format!("{}: {:?}, ", stringify!($var), $var);
			)*
			format!("[{}] | {message}", $title)
		}
	}};
	($($var:expr),*) => {
		#[cfg(debug_assertions)]{
			let mut message = String::from("");
			$(
				message += &format!("{}: {:?}, ", stringify!($var), $var);
			)*
			message
		}
	};
}

#[macro_export]
macro_rules! log {
	($($x:tt)*) => {
		#[cfg(debug_assertions)]{{
			use crate::log_format;
			use crate::logging::*;
			log_format!($($x)*).log();
		}}
	}
}

#[macro_export]
macro_rules! log_debug {
	($($x:tt)*) => {
		#[cfg(debug_assertions)]{{
			use crate::log_format;
			use crate::logging::*;
			log_format!($($x)*).log_debug();
		}}
	}
}

#[macro_export]
macro_rules! wasm_assert_eq {
	($left:expr, $right:expr $(,)?) => ({
		#[cfg(debug_assertions)]
		{
			let left_name = stringify!($left);
			let right_name = stringify!($right);
			match (&$left, &$right) {
				(left_val, right_val) => {
					if !(*left_val == *right_val) {
						format!("assertion failed: `${} == ${} : ({:?} == {:?})`", left_name, right_name, left_val, right_val).log_error();
						panic!();
					}
				}
			}
		}
	});
	($left:expr, $right:expr, $($arg:tt)+) => ({
		#[cfg(debug_assertions)]
		{
			let left_name = stringify!($left);
			let right_name = stringify!($right);
			match (&$left, &$right) {
				(left_val, right_val) => {
					if !(*left_val == *right_val) {
						format!("assertion failed: `${} == ${} : ({:?} == {:?})`: {}", left_name, right_name, left_val, right_val, format_args!($($arg)+)).log_error();
						panic!();
					}
				}
			}
		}
	});
}
