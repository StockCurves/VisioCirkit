import { describe, expect, it, vi } from "vitest"
import { CustomSymbolGraphicsController } from "../src/scripts/controllers/customSymbolGraphicsController"

describe("CustomSymbolGraphicsController", () => {
	it("loads runtime symbols into the symbol DB", async () => {
		const symbolDB = document.createElement("svg")
		const applicationService = {
			loadRuntimeSymbols: vi.fn().mockResolvedValue({
				customCategories: [],
				customSymbols: [],
			}),
		}
		const workspaceController = {
			applyState: vi.fn(),
			applyAndRender: vi.fn(),
			customSymbols: [],
		}
		const controller = new CustomSymbolGraphicsController({
			applicationService: applicationService as any,
			workspaceController: workspaceController as any,
			runtimeSymbols: [],
			circuitComponents: [],
			getSymbolDbElement: () => symbolDB,
			showAlert: vi.fn(async () => {}),
		})

		await controller.loadCustomSymbolsIntoSymbolDB()

		expect(applicationService.loadRuntimeSymbols).toHaveBeenCalledWith(symbolDB, [])
		expect(workspaceController.applyState).toHaveBeenCalledWith({
			customCategories: [],
			customSymbols: [],
		})
	})

	it("reports missing metadata on duplicate", async () => {
		const applicationService = {
			duplicateGraphicsSymbol: vi.fn().mockResolvedValue("missing-metadata"),
		}
		const workspaceController = {
			applyState: vi.fn(),
			applyAndRender: vi.fn(),
			customSymbols: [],
		}
		const showAlert = vi.fn(async () => {})
		const controller = new CustomSymbolGraphicsController({
			applicationService: applicationService as any,
			workspaceController: workspaceController as any,
			runtimeSymbols: [],
			circuitComponents: [],
			getSymbolDbElement: () => document.createElement("svg"),
			showAlert,
		})

		await controller.duplicateSymbol({ tikzName: "old" } as any, "new", "Mine")

		expect(showAlert).toHaveBeenCalledWith(
			"Missing Metadata",
			"Could not find the metadata for the original symbol!"
		)
		expect(workspaceController.applyAndRender).not.toHaveBeenCalled()
	})

	it("skips no-op graphics renames", async () => {
		const applicationService = {
			renameGraphicsSymbol: vi.fn().mockResolvedValue("no-op"),
		}
		const workspaceController = {
			applyState: vi.fn(),
			applyAndRender: vi.fn(),
			customSymbols: [],
		}
		const controller = new CustomSymbolGraphicsController({
			applicationService: applicationService as any,
			workspaceController: workspaceController as any,
			runtimeSymbols: [],
			circuitComponents: [],
			getSymbolDbElement: () => document.createElement("svg"),
			showAlert: vi.fn(async () => {}),
		})

		await controller.renameCustomGraphicsSymbol("old", "old")

		expect(applicationService.renameGraphicsSymbol).toHaveBeenCalledWith(
			"old",
			"old",
			expect.anything(),
			[],
			[],
			[]
		)
		expect(workspaceController.applyAndRender).not.toHaveBeenCalled()
	})
})
