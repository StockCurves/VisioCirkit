/**
 * The main source file. Does only include {@link MainController}, which does the actual work.
 */

import { bootstrapRuntimeConfig } from "./config/runtimeBootstrap"

bootstrapRuntimeConfig()

void import("./internal").then(({ MainController }) => {
	// @ts-ignore
	window.mainController = MainController.instance
})
