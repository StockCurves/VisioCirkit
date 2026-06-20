import { describe, expect, it, vi } from "vitest"
import { CustomSymbolStateController } from "../src/scripts/controllers/customSymbolStateController"

describe("CustomSymbolStateController", () => {
	it("stores custom symbol state and forwards render calls", () => {
		const drawerController = {
			render: vi.fn(),
		}
		const controller = new CustomSymbolStateController(drawerController as any)
		const state = {
			customCategories: [{ name: "Mine", symbolIds: ["custom-a"] }],
			customSymbols: [{ id: "custom-a", tikzName: "a", displayName: "A" }],
		}

		controller.applyState(state)
		expect(controller.customCategories).toEqual(state.customCategories)
		expect(controller.customSymbols).toEqual(state.customSymbols)

		controller.render([{ tikzName: "node-a" }] as any, { hideDrawer: vi.fn() } as any)

		expect(drawerController.render).toHaveBeenCalledWith(
			state.customCategories,
			state.customSymbols,
			[{ tikzName: "node-a" }],
			expect.objectContaining({ hideDrawer: expect.any(Function) })
		)
	})

	it("applies and renders state in one step", () => {
		const drawerController = {
			render: vi.fn(),
		}
		const controller = new CustomSymbolStateController(drawerController as any)

		controller.applyAndRender(
			{
				customCategories: [{ name: "Mine", symbolIds: ["custom-a"] }],
				customSymbols: [{ id: "custom-a", tikzName: "a", displayName: "A" }],
			},
			[] as any,
			{ hideDrawer: vi.fn() } as any
		)

		expect(drawerController.render).toHaveBeenCalledTimes(1)
	})
})
