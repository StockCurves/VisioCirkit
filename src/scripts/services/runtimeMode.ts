import { LocalTemplateFileService } from "./localTemplateFileService"
import { TemplateFileService } from "./templateFileService"
import { TemplateDataSource } from "./templateTypes"

export type RuntimeMode = "server" | "local"

export function getRuntimeMode(hostname: string = window.location.hostname): RuntimeMode {
	const configured =
		typeof process === "undefined" ? undefined : process.env?.PARCEL_APP_STORAGE_MODE
	if (configured === "server" || configured === "local") {
		return configured
	}
	return ["localhost", "127.0.0.1"].includes(hostname) ? "server" : "local"
}

export function createTemplateDataSource(mode: RuntimeMode = getRuntimeMode()): TemplateDataSource {
	return mode === "server" ? new TemplateFileService() : new LocalTemplateFileService()
}
