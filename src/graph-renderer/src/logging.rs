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
	#[wasm_bindgen(js_namespace = console, js_name = debug)]
	fn log_debug2(s: &str, s2: &str);
	#[wasm_bindgen(js_namespace = console, js_name = debug)]
	fn log_debug3(s: &str, s2: &str, s3: &str);

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
	fn log_debug2(&self, other: &str);
	fn log_debug3(&self, b: &str, c: &str);
}

impl LogDebug for &str {
	fn log_debug(&self) {
		log_debug(self);
	}
	fn log_debug2(&self, other: &str) {
		log_debug2(self, other);
	}
	fn log_debug3(&self, b: &str, c: &str) {
		log_debug3(self, b, c);
	}
}

impl LogDebug for String {
	fn log_debug(&self) {
		log_debug(self);
	}
	fn log_debug2(&self, other: &str) {
		log_debug2(self, other);
	}
	fn log_debug3(&self, b: &str, c: &str) {
		log_debug3(self, b, c);
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
	($str:literal) => {{
		$str
	}};
	($title:literal, $var:expr) => {{
		let message = format!("{}: {:?}", stringify!($var), $var);
		format!("[{}] | {message}", $title)
	}};
	($title:literal, $($var:expr),*) => {{
		let mut message = String::from("");
		$(
			message += &format!("{}: {:?}, ", stringify!($var), $var);
		)*
		format!("[{}] | {message}", $title)
	}};
	($var:ident) => {
		format!("{}: {:?}", stringify!($var), $var)
	};
	($var:expr) => {{
		format!("{}", $var)
	}};
	($($var:expr),*) => {{
		let mut message = String::from("");
		$(
			message += &format!("{}: {:?}, ", stringify!($var), $var);
		)*
		message
	}};
}

#[macro_export]
macro_rules! log {
	($($x:tt)*) => {
		#[cfg(not(debug_assertions))]{{
			compile_error!("log!() can only be used in debug mode")
		}}

		#[allow(unused_imports)]
		use $crate::logging::*;
		$crate::log_format!($($x)*).log();
	}
}

#[macro_export]
macro_rules! log_info {
	($($x:tt)*) => {
		#[allow(unused_imports)]
		use $crate::logging::*;
		$crate::log_format!($($x)*).log_info();
	}
}

#[macro_export]
macro_rules! log_warn {
	($($x:tt)*) => {
		#[allow(unused_imports)]
		use $crate::logging::*;
		$crate::log_format!($($x)*).log_warn();
	}
}

#[macro_export]
macro_rules! log_error {
	($($x:tt)*) => {
		#[allow(unused_imports)]
		use $crate::logging::*;
		$crate::log_format!($($x)*).log_error();
	}
}

#[macro_export]
macro_rules! log_debug {
	($($x:tt)*) => {
		#[cfg(debug_assertions)]{{
			#[allow(unused_imports)]
			use $crate::logging::*;
			$crate::log_format!($($x)*).log_debug();
		}}
	}
}

#[macro_export]
macro_rules! trace {
	($($x:tt)*) => {
		#[cfg(feature = "trace")]
		{
			{
				#[allow(unused_imports)]
				use $crate::logging::*;

				let module_path = module_path!();

				let module_name = match module_path.rfind(":") {
					Some(index) => Some(&module_path[(index + 1)..]),
					None => None,
				};

				let formatted_log = $crate::log_format!($($x)*);

				if let Some(module_name) = module_name{
					(String::from("%c[") + module_name + "]").log_debug3("color: #B7410E;", &formatted_log);
				}
				else{
					formatted_log.log_debug();
				}
			}
		}
	};
}

#[macro_export]
macro_rules! wasm_assert {
	($val:expr $(,)?) => {{
		#[cfg(debug_assertions)]
		{
			let val_name = stringify!($val);

			if !$val {
				format!("assertion failed: `{}`", val_name).log_error();
				panic!();
			}
		}
	}};
	($val:expr, $($arg:tt)+) => {{
		#[cfg(debug_assertions)]
		{
			#[allow(unused_imports)]
			use $crate::logging::*;

			let val_name = stringify!($val);

			if !$val {
				format!("assertion failed: `{}`: {}", val_name, format_args!($($arg)+)).log_error();
				panic!();
			}
		}
	}};
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
