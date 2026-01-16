import { _internalLog } from "#devLogger";

export function log(...obj: unknown[]) {
	_internalLog(...obj);
}
