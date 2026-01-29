use proc_macro::TokenStream;
use quote::quote;
use syn::{Fields, ItemStruct, Visibility, parse_macro_input};

struct Field {
	struc: proc_macro2::TokenStream,
	imple: proc_macro2::TokenStream,
}

#[proc_macro_attribute]
pub fn wasm_struct(_attr: TokenStream, input: TokenStream) -> TokenStream {
	let ast = parse_macro_input!(input as ItemStruct);
	if let Visibility::Public(_) = ast.vis {
	} else {
		return syn::Error::new_spanned(
			&ast.vis,
			"The `#[wasm_struct]` attribute can only be applied to `pub struct` definitions.",
		)
		.to_compile_error()
		.into();
	}

	let struct_name = &ast.ident;

	let field_code: Vec<_> = match &ast.fields {
		Fields::Named(fields) => fields
			.named
			.iter()
			.map(|field| {
				let field_name = field
					.ident
					.as_ref()
					.expect("Named field should have an identifier");
				let field_type = &field.ty;

				Field {
					struc: quote! {
							#field_name: #field_type,
					},
					imple: quote! {
						#field_name,
					},
				}
			})
			.collect(),
		_ => panic!("The `#[wasm_struct]` attribute can only be applied to structs with named fields."),
	};

	let struc = field_code.iter().map(|f| &f.struc);
	let struc2 = struc.clone();
	let imple = field_code.iter().map(|f| &f.imple);

	let expanded = quote! {
		#[wasm_bindgen]
		#[derive(Debug, Clone)]
		pub struct #struct_name{
			#(#struc)*
		}

		#[wasm_bindgen]
		impl #struct_name {
			#[wasm_bindgen(constructor)]
			pub fn new(#(#struc2)*) -> Self {
				Self{ #(#imple)* }
			}
		}
	};

	expanded.into()
}

#[cfg(test)]
mod tests {
	use super::*;

	#[test]
	fn it_works() {
		let result = add(2, 2);
		assert_eq!(result, 4);
	}
}
