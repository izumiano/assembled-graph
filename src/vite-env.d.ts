/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_VERBOSE_LOG: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
