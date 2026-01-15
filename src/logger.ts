if (import.meta.env.VITE_VERBOSE_LOG === "true") {
	console.info("VERBOSE LOGGING ENABLED");
}

const logs: { timestamp: number; message: string }[] = [];

export function _internalLog(...obj: unknown[]) {
	console.log(...obj);
	handleExternalLogs(...obj);
}

export function logError(...obj: unknown[]) {
	if (import.meta.env.VITE_VERBOSE_LOG === "true") {
		console.error("[ERROR]", ...obj);

		handleExternalLogs("[ERROR]", ...obj);
	}
}

export function logWarn(...obj: unknown[]) {
	if (import.meta.env.VITE_VERBOSE_LOG === "true") {
		console.warn("[WARN]", ...obj);

		handleExternalLogs("[WARN]", ...obj);
	}
}

export function logVerbose(...obj: unknown[]) {
	if (import.meta.env.VITE_VERBOSE_LOG === "true") {
		console.debug("[VERBOSE]", ...obj);

		handleExternalLogs("[VERBOSE]", ...obj);
	}
}

export function logVerboseWithStacktrace(...obj: unknown[]) {
	if (import.meta.env.VITE_VERBOSE_LOG === "true") {
		const stackTrace = new Error().stack;
		console.debug("[VERBOSE]", ...obj, stackTrace);

		handleExternalLogs("[VERBOSE]", ...obj, stackTrace);
	}
}

export function sendLogs() {
	const logServer = import.meta.env.VITE_LOG_URL;
	if (import.meta.env.VITE_DO_SERVER_LOG === "true" && logServer) {
		const request = new Request(logServer, {
			body: JSON.stringify(logs),
			method: "POST",
		});
		logs.length = 0;
		console.log("sending", request);
		fetch(request);
	}
}

export function handleExternalLogs(...obj: unknown[]) {
	const logServer = import.meta.env.VITE_LOG_URL;
	if (import.meta.env.VITE_DO_SERVER_LOG === "true" && logServer) {
		const body = {
			timestamp: performance.now(),
			message: JSON.stringify(obj),
		};
		logs.push(body);
	}
}
