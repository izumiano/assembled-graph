export function _internalLog(...obj: unknown[]) {
	console.log(...obj);
}

export function logVerbose(...obj: unknown[]) {
	if (import.meta.env.VITE_VERBOSE_LOG === "true") {
		console.debug("[VERBOSE]", ...obj);
	}
}

export function logVerboseWithStacktrace(...obj: unknown[]) {
	if (import.meta.env.VITE_VERBOSE_LOG === "true") {
		const stackTrace = new Error().stack;
		console.debug("[VERBOSE]", ...obj, stackTrace);
		return;
	}
}
