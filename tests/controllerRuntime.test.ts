import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../src/scripts/components/componentSymbol", () => ({
	ComponentSymbol: class {},
}))

vi.mock("../src/scripts/components/circuitComponent", () => ({
	CircuitComponent: class {},
}))

vi.mock("../src/scripts/services/subcircuitPreviewService", () => ({
	SubcircuitPreviewService: class {
		generatePreview = vi.fn().mockResolvedValue(null)
	},
}))

import { createRuntimeConfig } from "../src/scripts/config/runtimeConfig"
import { createLiveRenderControllerRuntime, createTemplateControllerRuntime } from "../src/scripts/services/controllerRuntime"
import { setAppRuntimeForTests } from "../src/scripts/services/appRuntime"

describe("controllerRuntime", () => {
	afterEach(() => {
		setAppRuntimeForTests(null)
		vi.unstubAllGlobals()
	})

	it("creates template controller runtime bindings through appRuntime", async () => {
		const applicationService = {
			bootstrapDefaultFile: vi.fn(),
			openFile: vi.fn(),
			saveWork: vi.fn(),
			deleteWork: vi.fn(),
			getState: vi.fn(),
		}

		setAppRuntimeForTests({
			config: createRuntimeConfig({}, "example.com"),
			createTemplateApplicationService: vi.fn().mockReturnValue(applicationService),
			createLatexRenderService: vi.fn(),
		} as any)

		const runtime = createTemplateControllerRuntime(
			{
				getCode: vi.fn(),
				setCode: vi.fn(),
				applyEditorText: vi.fn(),
			},
			{
				alert: vi.fn(),
				confirm: vi.fn(),
			}
		)

		expect(runtime.applicationService).toBe(applicationService)
	})

	it("creates live render controller runtime bindings through appRuntime", () => {
		const latexRenderService = {
			renderViaQuickLaTeX: vi.fn(),
		}

		setAppRuntimeForTests({
			config: createRuntimeConfig({}, "example.com"),
			createTemplateApplicationService: vi.fn(),
			createLatexRenderService: vi.fn().mockReturnValue(latexRenderService),
		} as any)

		const runtime = createLiveRenderControllerRuntime()

		expect(runtime.latexRenderService).toBe(latexRenderService)
	})
})
