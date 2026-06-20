import { beforeEach, describe, expect, it, vi } from "vitest"

const menuResponses: Array<string | null> = []
const openForResult = vi.fn(() => Promise.resolve(menuResponses.shift() ?? null))

vi.mock("../src/scripts/controllers/contextMenu", () => ({
	ContextMenu: class {
		public openForResult = openForResult
	},
}))

import { SymbolLibraryMenuController } from "../src/scripts/controllers/symbolLibraryMenuController"

describe("SymbolLibraryMenuController", () => {
	beforeEach(() => {
		menuResponses.length = 0
		openForResult.mockClear()
	})

	it("creates a category immediately when standard symbols have no categories", async () => {
		const controller = new SymbolLibraryMenuController()
		const action = await controller.openForSymbol({
			clientX: 0,
			clientY: 0,
			symbolName: "resistor",
			isCustomSymbol: false,
			categoryNames: [],
			openPrompt: vi.fn(async () => "Basics"),
			openRenameModal: vi.fn(async () => null),
			openConfirm: vi.fn(async () => false),
		})

		expect(action).toEqual({ type: "create-category-and-add", categoryName: "Basics" })
		expect(openForResult).not.toHaveBeenCalled()
	})

	it("handles rename and delete for custom symbols through prompts", async () => {
		const controller = new SymbolLibraryMenuController()

		menuResponses.push("rename")
		await expect(controller.openForSymbol({
			clientX: 1,
			clientY: 2,
			symbolName: "old mos",
			isCustomSymbol: true,
			categoryNames: ["Mine"],
			openPrompt: vi.fn(async () => null),
			openRenameModal: vi.fn(async () => "new mos"),
			openConfirm: vi.fn(async () => true),
		})).resolves.toEqual({ type: "rename", newName: "new mos" })

		menuResponses.push("delete")
		await expect(controller.openForSymbol({
			clientX: 1,
			clientY: 2,
			symbolName: "old mos",
			isCustomSymbol: true,
			categoryNames: ["Mine"],
			openPrompt: vi.fn(async () => null),
			openRenameModal: vi.fn(async () => null),
			openConfirm: vi.fn(async () => true),
		})).resolves.toEqual({ type: "delete" })
	})

	it("collects duplicate target name and category", async () => {
		const controller = new SymbolLibraryMenuController()

		menuResponses.push("duplicate")
		const action = await controller.openForSymbol({
			clientX: 5,
			clientY: 6,
			symbolName: "pmos",
			isCustomSymbol: false,
			categoryNames: ["Mine", "Lab"],
			openPrompt: vi.fn()
				.mockResolvedValueOnce("hvnmos")
				.mockResolvedValueOnce("2"),
			openRenameModal: vi.fn(async () => null),
			openConfirm: vi.fn(async () => false),
		})

		expect(action).toEqual({ type: "duplicate", newName: "hvnmos", categoryName: "Lab" })
	})

	it("executes create-category, add, and duplicate actions through callbacks", async () => {
		const controller = new SymbolLibraryMenuController()
		const openEditor = vi.fn()
		const renameSymbol = vi.fn(async () => {})
		const deleteSymbol = vi.fn(async () => {})
		const addCategory = vi.fn(async () => {})
		const addToCategory = vi.fn(async () => {})
		const duplicateSymbol = vi.fn(async () => {})

		await controller.executeAction(
			{ type: "create-category-and-add", categoryName: "Fresh" },
			{
				symbolName: "pmos",
				categoryNames: ["Mine"],
				openEditor,
				renameSymbol,
				deleteSymbol,
				addCategory,
				addToCategory,
				duplicateSymbol,
			}
		)
		await controller.executeAction(
			{ type: "duplicate", newName: "pmos_copy", categoryName: "Fresh" },
			{
				symbolName: "pmos",
				categoryNames: ["Mine"],
				openEditor,
				renameSymbol,
				deleteSymbol,
				addCategory,
				addToCategory,
				duplicateSymbol,
			}
		)

		expect(addCategory).toHaveBeenNthCalledWith(1, "Fresh")
		expect(addToCategory).toHaveBeenCalledWith("Fresh", "pmos")
		expect(addCategory).toHaveBeenNthCalledWith(2, "Fresh")
		expect(duplicateSymbol).toHaveBeenCalledWith("pmos", "pmos_copy", "Fresh")
	})
})
