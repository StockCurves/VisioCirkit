import { describe, expect, it, vi } from "vitest"

vi.mock("../src/scripts/internal", () => ({
	CircuitComponent: class {},
	NodeSymbolComponent: class NodeSymbolComponent {},
	PathSymbolComponent: class PathSymbolComponent {},
	SubcircuitComponent: class SubcircuitComponent {
		static fromJson(data: any) {
			const instance = new SubcircuitComponent()
			;(instance as any).data = data
			return instance
		}
	},
}))

import { createCustomSymbolDrawerActions } from "../src/scripts/controllers/customSymbolDrawerActionsFactory"

describe("createCustomSymbolDrawerActions", () => {
	it("forwards component placement through the injected callbacks", () => {
		const switchToComponentMode = vi.fn()
		const cancelComponentPlacement = vi.fn()
		const placeComponent = vi.fn()
		const actions = createCustomSymbolDrawerActions({
			hideDrawer: vi.fn(),
			openRenameModal: vi.fn(),
			openConfirm: vi.fn(),
			renameCategory: vi.fn(),
			deleteCategory: vi.fn(),
			removeSymbolFromCategory: vi.fn(),
			openSymbolEditor: vi.fn(),
			renameGraphicsSymbol: vi.fn(),
			deleteGraphicsSymbol: vi.fn(),
			renameSubcircuit: vi.fn(),
			deleteSubcircuit: vi.fn(),
			switchToComponentMode,
			cancelComponentPlacement,
			placeComponent,
			generateSubcircuitPreview: vi.fn(),
			persistCustomSymbol: vi.fn(),
		})

		actions.placeStandardSymbol({
			tikzName: "node-a",
			isNodeSymbol: true,
		} as any)
		actions.placeStandardSymbol({
			tikzName: "path-a",
			isNodeSymbol: false,
		} as any)
		actions.placeSubcircuit({
			id: "custom-a",
			tikzName: "sub-a",
			isCustomSymbol: true,
			subcircuitData: { components: [] },
		} as any)

		expect(switchToComponentMode).toHaveBeenCalledTimes(3)
		expect(cancelComponentPlacement).toHaveBeenCalledTimes(3)
		expect(placeComponent).toHaveBeenCalledTimes(3)
		expect(placeComponent.mock.calls[0][0].constructor.name).toBe("NodeSymbolComponent")
		expect(placeComponent.mock.calls[1][0].constructor.name).toBe("PathSymbolComponent")
		expect(placeComponent.mock.calls[2][0].constructor.name).toBe("SubcircuitComponent")
	})
})
