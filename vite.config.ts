import { biomePlugin } from "@pbr1111/vite-plugin-biome";
import dts from 'vite-plugin-dts';
import { AliasOptions, defineConfig } from "vite";
import path, {resolve} from "path";

// https://vite.dev/config/
export default defineConfig(({mode}) => {
	const dev = mode === "development";

	const aliases: AliasOptions = {"#logger": path.resolve(__dirname, "./src/logger")};

	if(dev){
		aliases["#devLogger"] = path.resolve(__dirname, "./src/logger");
	}

	return {
		plugins: [biomePlugin(), dts({insertTypesEntry: true, tsconfigPath: "./tsconfig.json", exclude: ["src/logger.ts", "src/devLogger.ts"]})],
		base: "/",
		resolve: {
			alias: aliases
		},
		esbuild: {
			minifyIdentifiers: !dev,
			keepNames: dev
		},
		build: {
			lib: {
				entry: resolve(__dirname, "src/index.ts"),
				name: "react-assembledGraph",
				fileName: "index"
			}
		}}
});
