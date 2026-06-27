import { getAppRuntime } from "./appRuntime"
import { LatexRenderService } from "./latexRenderService"
import { TemplateApplicationService } from "./templateApplicationService"
import { TemplateEditorPort, TemplateNotifierPort } from "./templateTypes"

export interface TemplateControllerRuntime {
	readonly applicationService: TemplateApplicationService
}

export interface LiveRenderControllerRuntime {
	readonly latexRenderService: LatexRenderService
}

export function createTemplateControllerRuntime(
	editor: TemplateEditorPort,
	notifier: TemplateNotifierPort
): TemplateControllerRuntime {
	return {
		applicationService: getAppRuntime().createTemplateApplicationService(editor, notifier),
	}
}

export function createLiveRenderControllerRuntime(): LiveRenderControllerRuntime {
	return {
		latexRenderService: getAppRuntime().createLatexRenderService(),
	}
}
