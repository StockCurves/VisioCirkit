import { describe, expect, it, vi } from "vitest"
import { CustomSymbolSelectionController } from "../src/scripts/controllers/customSymbolSelectionController"

describe("CustomSymbolSelectionController", () => {
	it("alerts when nothing is selected", async () => {
		const controller = new CustomSymbolSelectionController()
		const showAlert = vi.fn(async () => {})

		await expect(controller.resolveGroupSelection({
			selectedComponents: [],
			getCurrentSelection: () => [],
			groupSelection: vi.fn(),
			showAlert,
		})).resolves.toBeNull()

		expect(showAlert).toHaveBeenCalledWith(
			"Create Custom Component",
			"Please select components to create a custom component."
		)
	})

	it("returns an existing grouped selection directly", async () => {
		const controller = new CustomSymbolSelectionController()
		const grouped = { constructor: { name: "GroupComponent" }, displayName: "Grouped" } as any

		await expect(controller.resolveGroupSelection({
			selectedComponents: [grouped],
			getCurrentSelection: () => [grouped],
			groupSelection: vi.fn(),
			showAlert: vi.fn(async () => {}),
		})).resolves.toBe(grouped)
	})

	it("groups multiple components and returns the grouped selection", async () => {
		const controller = new CustomSymbolSelectionController()
		const grouped = { constructor: { name: "GroupComponent" }, displayName: "Grouped" } as any
		let currentSelection: any[] = [{ id: 1 }, { id: 2 }]
		const groupSelection = vi.fn(() => {
			currentSelection = [grouped]
		})

		await expect(controller.resolveGroupSelection({
			selectedComponents: currentSelection as any,
			getCurrentSelection: () => currentSelection as any,
			groupSelection,
			showAlert: vi.fn(async () => {}),
		})).resolves.toBe(grouped)

		expect(groupSelection).toHaveBeenCalledTimes(1)
	})
})
