import { biomePlugin } from "@pbr1111/vite-plugin-biome";
import dts from 'vite-plugin-dts';
import { defineConfig } from "vite";
import {resolve} from "path";

// https://vite.dev/config/
export default defineConfig({
	plugins: [biomePlugin(), dts({insertTypesEntry: true, tsconfigPath: "./tsconfig.json"})],
	base: "/",
	build: {
		lib: {
			entry: resolve(__dirname, "src/index.ts"),
			name: "react-assembledGraph",
			fileName: "index"
		}
	}
});
