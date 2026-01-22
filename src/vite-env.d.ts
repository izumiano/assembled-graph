/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_TRACE?: string;
	readonly VITE_DO_SERVER_LOG?: string;
	readonly VITE_LOG_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
