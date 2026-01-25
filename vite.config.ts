import { biomePlugin } from "@pbr1111/vite-plugin-biome";
import dts from 'vite-plugin-dts';
import { defineConfig, loadEnv } from "vite";
import path, {resolve} from "path";
import logPlugin from "@izumiano/vite-plugin-logger";
import glsl from "vite-plugin-glsl"

// https://vite.dev/config/
export default defineConfig(({mode}) => {
	const dev = mode === "development";

	const {VITE_TRACE, VITE_DO_SERVER_LOG, VITE_LOG_URL} = loadEnv(mode, path.resolve(__dirname))

	return {
		plugins: [
			biomePlugin(), 
			logPlugin({mode, traceEnabled: VITE_TRACE === "true", doServerLog: VITE_DO_SERVER_LOG === "true", logUrl: VITE_LOG_URL}),
			glsl({minify: !dev}),
			dts({insertTypesEntry: true, tsconfigPath: "./tsconfig.json", exclude: ["src/logger.ts", "src/devLogger.ts"]})],
		base: "/",
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
