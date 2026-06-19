import { describe, expect, it, vi } from "vitest"
import { CustomSymbolApplicationService } from "../src/scripts/services/customSymbolApplicationService"

describe("CustomSymbolApplicationService", () => {
	it("loads custom symbol state through the underlying service", async () => {
		const customSymbolService = {
			getCustomCategories: vi.fn().mockResolvedValue([{ name: "Mine", symbolIds: ["custom-a"] }]),
			getCustomSymbols: vi.fn().mockResolvedValue([{ id: "custom-a", tikzName: "a", displayName: "A" }]),
		}
		const service = new CustomSymbolApplicationService(customSymbolService as any)

		await expect(service.loadState()).resolves.toEqual({
			customCategories: [{ name: "Mine", symbolIds: ["custom-a"] }],
			customSymbols: [{ id: "custom-a", tikzName: "a", displayName: "A" }],
		})
	})

	it("returns missing-metadata when duplicate cannot resolve source symbol metadata", async () => {
		const customSymbolService = {
			duplicateSymbol: vi.fn().mockResolvedValue(null),
		}
		const service = new CustomSymbolApplicationService(customSymbolService as any)

		await expect(
			service.duplicateGraphicsSymbol(document.createElement("svg"), [], [], { tikzName: "old" } as any, "new", "Mine")
		).resolves.toBe("missing-metadata")
	})

	it("renames custom graphics symbols and reloads state", async () => {
		const customSymbolService = {
			renameCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			getCustomCategories: vi.fn().mockResolvedValue([{ name: "Mine", symbolIds: ["new mos"] }]),
			getCustomSymbols: vi.fn().mockResolvedValue([{ id: "custom-new mos", tikzName: "new mos", displayName: "new mos" }]),
		}
		const service = new CustomSymbolApplicationService(customSymbolService as any)

		await expect(
			service.renameGraphicsSymbol("old mos", "new mos", document.createElement("svg"), [], [], [])
		).resolves.toEqual({
			customCategories: [{ name: "Mine", symbolIds: ["new mos"] }],
			customSymbols: [{ id: "custom-new mos", tikzName: "new mos", displayName: "new mos" }],
		})
		expect(customSymbolService.renameCustomGraphicsSymbol).toHaveBeenCalledWith(
			"old mos",
			"new mos",
			expect.anything(),
			[],
			[],
			[]
		)
	})
})
