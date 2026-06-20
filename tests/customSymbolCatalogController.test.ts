import { describe, expect, it, vi } from "vitest"
import { CustomSymbolCatalogController } from "../src/scripts/controllers/customSymbolCatalogController"

describe("CustomSymbolCatalogController", () => {
	it("loads state and re-renders the workspace", async () => {
		const applicationService = {
			loadState: vi.fn().mockResolvedValue({
				customCategories: [{ name: "Mine", symbolIds: [] }],
				customSymbols: [],
			}),
		}
		const workspaceController = {
			customSymbols: [],
			applyAndRender: vi.fn(),
		}
		const controller = new CustomSymbolCatalogController({
			applicationService: applicationService as any,
			workspaceController: workspaceController as any,
			runtimeSymbols: [{ tikzName: "node-a" } as any],
			circuitComponents: [],
		})

		await controller.loadAndRenderCustomCategories()

		expect(applicationService.loadState).toHaveBeenCalledTimes(1)
		expect(workspaceController.applyAndRender).toHaveBeenCalledWith(
			{
				customCategories: [{ name: "Mine", symbolIds: [] }],
				customSymbols: [],
			},
			[{ tikzName: "node-a" }]
		)
	})

	it("skips no-op category renames", async () => {
		const applicationService = {
			renameCategory: vi.fn().mockResolvedValue("no-op"),
		}
		const workspaceController = {
			customSymbols: [],
			applyAndRender: vi.fn(),
		}
		const controller = new CustomSymbolCatalogController({
			applicationService: applicationService as any,
			workspaceController: workspaceController as any,
			runtimeSymbols: [],
			circuitComponents: [],
		})

		await controller.renameCustomCategory("Mine", "Mine")

		expect(applicationService.renameCategory).toHaveBeenCalledWith("Mine", "Mine")
		expect(workspaceController.applyAndRender).not.toHaveBeenCalled()
	})
})
