import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../src/scripts/components/groupComponent", () => ({
	GroupComponent: {
		group: vi.fn(),
	},
}))

vi.mock("../src/scripts/components/subcircuitComponent", () => ({
	SubcircuitComponent: class {
		private readonly name: string
		private readonly children: any[]

		public constructor(name: string, children: any[]) {
			this.name = name
			this.children = children
		}

		public toJson() {
			return {
				type: "subcircuit",
				name: this.name,
				components: this.children,
			}
		}
	},
}))

import { CustomSymbolSubcircuitSaveController } from "../src/scripts/controllers/customSymbolSubcircuitSaveController"

describe("CustomSymbolSubcircuitSaveController", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("restores grouped selection and saves the subcircuit record", async () => {
		const selectedA = { selected: true }
		const selectedB = { selected: true }
		const group = {
			displayName: "Amp",
			groupedComponents: [selectedA, selectedB],
			selectionElement: { remove: vi.fn() },
			visualization: { remove: vi.fn() },
		} as any
		const circuitComponents = [group]
		const selectionController = {
			resolveGroupSelection: vi.fn().mockResolvedValue(group),
		}
		const saveController = {
			open: vi.fn().mockResolvedValue({ name: "opamp", categoryName: "My Favorite" }),
		}
		const workspaceController = {
			customCategories: [{ name: "My Favorite", symbolIds: [] }],
			customSymbols: [{ id: "custom-old", tikzName: "old" }],
			applyAndRender: vi.fn(),
		}
		const applicationService = {
			saveSubcircuitRecord: vi.fn().mockResolvedValue({
				customCategories: [{ name: "My Favorite", symbolIds: ["custom-opamp"] }],
				customSymbols: [{ id: "custom-opamp", tikzName: "opamp" }],
			}),
		}
		const addUndoState = vi.fn()
		const showAlert = vi.fn(async () => {})

		const controller = new CustomSymbolSubcircuitSaveController({
			selectionController: selectionController as any,
			saveController: saveController as any,
			workspaceController: workspaceController as any,
			applicationService: applicationService as any,
			circuitComponents: circuitComponents as any,
			runtimeSymbols: [],
			showAlert,
			addUndoState,
		})

		await controller.createSubcircuitFromSelection()

		expect(saveController.open).toHaveBeenCalledWith({
			initialName: "Amp",
			categories: ["My Favorite"],
			showAlert,
		})
		expect(circuitComponents).toEqual([selectedA, selectedB])
		expect(group.groupedComponents).toEqual([])
		expect(group.selectionElement.remove).toHaveBeenCalledTimes(1)
		expect(group.visualization.remove).toHaveBeenCalledTimes(1)
		expect(applicationService.saveSubcircuitRecord).toHaveBeenCalledWith(
			"My Favorite",
			"opamp",
			{
				type: "subcircuit",
				name: "opamp",
				components: [selectedA, selectedB],
			},
			workspaceController.customSymbols,
			["My Favorite"]
		)
		expect(workspaceController.applyAndRender).toHaveBeenCalledWith(
			{
				customCategories: [{ name: "My Favorite", symbolIds: ["custom-opamp"] }],
				customSymbols: [{ id: "custom-opamp", tikzName: "opamp" }],
			},
			[]
		)
		expect(addUndoState).toHaveBeenCalledTimes(1)
	})

	it("alerts when the grouped component is no longer present", async () => {
		const group = {
			displayName: "Amp",
			groupedComponents: [{ selected: true }],
			selectionElement: { remove: vi.fn() },
			visualization: { remove: vi.fn() },
		} as any
		const selectionController = {
			resolveGroupSelection: vi.fn().mockResolvedValue(group),
		}
		const saveController = {
			open: vi.fn().mockResolvedValue({ name: "opamp", categoryName: "My Favorite" }),
		}
		const showAlert = vi.fn(async () => {})
		const controller = new CustomSymbolSubcircuitSaveController({
			selectionController: selectionController as any,
			saveController: saveController as any,
			workspaceController: {
				customCategories: [{ name: "My Favorite", symbolIds: [] }],
				customSymbols: [],
				applyAndRender: vi.fn(),
			} as any,
			applicationService: {
				saveSubcircuitRecord: vi.fn(),
			} as any,
			circuitComponents: [] as any,
			runtimeSymbols: [],
			showAlert,
			addUndoState: vi.fn(),
		})

		await controller.createSubcircuitFromSelection()

		expect(showAlert).toHaveBeenCalledWith(
			"Save Custom Component",
			"Cannot find the group object; unable to save."
		)
		expect(saveController.open).toHaveBeenCalledTimes(1)
	})
})
