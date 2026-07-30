import { describe, expect, it, vi } from "vitest"
import { AddComponentOffcanvasController } from "../src/scripts/controllers/addComponentOffcanvasController"

describe("AddComponentOffcanvasController", () => {
	it("binds toolbar, renders the libraries, and wires context menu actions", async () => {
		document.body.innerHTML = `
			<div id="leftOffcanvas"></div>
			<div id="leftOffcanvasAccordion"></div>
			<input id="componentFilterInput" />
			<button id="filterRegexButton"></button>
			<button id="addCategoryButton"></button>
			<button id="shapeLibraryMoreButton"></button>
			<div id="shapeLibraryCategoryList"></div>
			<input type="checkbox" id="shapeLibraryRememberCheckbox" />
			<button id="shapeLibraryApplyButton"></button>
			<div id="invalid-feedback-text"></div>
		`

		const componentLibraryController = {
			bindToolbar: vi.fn(),
			render: vi.fn(),
		}
		const shapeLibraryController = {
			getCategories: () => [
				{ id: "basic", name: "Basic", items: [{ id: "ellipse", name: "Ellipse" }] },
				{ id: "flowchart", name: "Flowchart", items: [{ id: "decision", name: "Decision" }] },
			],
			render: vi.fn(),
		}
		const openAndExecute = vi.fn().mockResolvedValue(undefined)
		const symbolLibraryMenuController = {
			openAndExecute,
		}
		const addCustomCategory = vi.fn().mockResolvedValue(undefined)
		const loadCustomCategories = vi.fn().mockResolvedValue(undefined)
		const controller = new AddComponentOffcanvasController({
			componentLibraryController: componentLibraryController as any,
			shapeLibraryController: shapeLibraryController as any,
			symbolLibraryMenuController: symbolLibraryMenuController as any,
			hideDrawer: vi.fn(),
			switchToPanMode: vi.fn(),
			switchToComponentMode: vi.fn(),
			cancelComponentPlacement: vi.fn(),
			placeComponent: vi.fn(),
			openPrompt: vi.fn(),
			openRenameModal: vi.fn(),
			openConfirm: vi.fn(),
			addCustomCategory,
			loadCustomCategories,
			getCustomCategoryNames: () => ["Mine"],
			getSymbolByName: (name) => (name === "dup" ? ({ tikzName: "dup" } as any) : undefined),
			openSymbolEditor: vi.fn(),
			renameCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			deleteCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			addSymbolToCategory: vi.fn().mockResolvedValue(undefined),
			duplicateSymbol: vi.fn().mockResolvedValue(undefined),
		})

		await controller.initialize(
			document.getElementById("leftOffcanvas") as HTMLDivElement,
			document.getElementById("leftOffcanvasAccordion") as HTMLDivElement,
			[{ tikzName: "dup" } as any]
		)

		expect(componentLibraryController.bindToolbar).toHaveBeenCalledTimes(1)
		expect(shapeLibraryController.render).toHaveBeenCalledTimes(1)
		expect(loadCustomCategories).toHaveBeenCalledTimes(1)
		expect(componentLibraryController.render).toHaveBeenCalledTimes(1)

		const renderCallbacks = componentLibraryController.render.mock.calls[0][2]
		await renderCallbacks.openContextMenu({ clientX: 1, clientY: 2 } as MouseEvent, { tikzName: "dup" } as any)
		expect(openAndExecute).toHaveBeenCalledWith(
			expect.objectContaining({
				clientX: 1,
				clientY: 2,
				symbolName: "dup",
				categoryNames: ["Mine"],
			})
		)
	})

	it("uses More Shapes to apply built-in shape and symbol category visibility", async () => {
		document.body.innerHTML = `
			<div id="leftOffcanvas"></div>
			<div id="leftOffcanvasAccordion"></div>
			<input id="componentFilterInput" />
			<button id="filterRegexButton"></button>
			<button id="addCategoryButton"></button>
			<button id="shapeLibraryMoreButton"></button>
			<div id="shapeLibraryCategoryList"></div>
			<input type="checkbox" id="shapeLibraryRememberCheckbox" />
			<button id="shapeLibraryApplyButton"></button>
			<div id="invalid-feedback-text"></div>
		`
		localStorage.clear()

		const componentLibraryController = {
			bindToolbar: vi.fn(),
			render: vi.fn(),
		}
		const shapeLibraryController = {
			getCategories: () => [
				{ id: "basic", name: "Basic", items: [{ id: "ellipse", name: "Ellipse" }] },
				{ id: "flowchart", name: "Flowchart", items: [{ id: "decision", name: "Decision" }] },
			],
			render: vi.fn(),
		}
		const controller = new AddComponentOffcanvasController({
			componentLibraryController: componentLibraryController as any,
			shapeLibraryController: shapeLibraryController as any,
			symbolLibraryMenuController: { openAndExecute: vi.fn() } as any,
			hideDrawer: vi.fn(),
			switchToPanMode: vi.fn(),
			switchToComponentMode: vi.fn(),
			cancelComponentPlacement: vi.fn(),
			placeComponent: vi.fn(),
			openPrompt: vi.fn(),
			openRenameModal: vi.fn(),
			openConfirm: vi.fn(),
			addCustomCategory: vi.fn().mockResolvedValue(undefined),
			loadCustomCategories: vi.fn().mockResolvedValue(undefined),
			getCustomCategoryNames: () => [],
			getSymbolByName: vi.fn(),
			openSymbolEditor: vi.fn(),
			renameCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			deleteCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			addSymbolToCategory: vi.fn().mockResolvedValue(undefined),
			duplicateSymbol: vi.fn().mockResolvedValue(undefined),
		})

		await controller.initialize(
			document.getElementById("leftOffcanvas") as HTMLDivElement,
			document.getElementById("leftOffcanvasAccordion") as HTMLDivElement,
			[
				{ tikzName: "wire", groupName: "Wiring" } as any,
				{ tikzName: "junction", displayName: "Connected terminal", groupName: "Wiring" } as any,
				{ tikzName: "amp", groupName: "Block diagram" } as any,
			]
		)

		;(document.getElementById("shapeLibraryMoreButton") as HTMLButtonElement).click()
		const wiringCheckbox = document.querySelector<HTMLInputElement>('input[value="component:Wiring"]')
		const blockDiagramCheckbox = document.querySelector<HTMLInputElement>('input[value="component:Block diagram"]')
		const wireItemCheckbox = document.querySelector<HTMLInputElement>('input[value="component-item:Wiring:wire"]')
		const junctionItemCheckbox = document.querySelector<HTMLInputElement>('input[value="component-item:Wiring:junction"]')
		expect(wiringCheckbox?.checked).toBe(true)
		expect(blockDiagramCheckbox?.checked).toBe(true)
		expect(wireItemCheckbox?.checked).toBe(true)
		expect(junctionItemCheckbox?.checked).toBe(true)

		wireItemCheckbox!.click()
		;(document.getElementById("shapeLibraryRememberCheckbox") as HTMLInputElement).checked = true
		;(document.getElementById("shapeLibraryApplyButton") as HTMLButtonElement).click()

		expect(shapeLibraryController.render).toHaveBeenLastCalledWith(
			document.getElementById("leftOffcanvasAccordion"),
			expect.any(Object),
			["basic", "flowchart"],
			["ellipse", "decision"]
		)
		expect(componentLibraryController.render).toHaveBeenLastCalledWith(
			document.getElementById("leftOffcanvasAccordion"),
			[
				{ tikzName: "junction", displayName: "Connected terminal", groupName: "Wiring" },
				{ tikzName: "amp", groupName: "Block diagram" },
			],
			expect.any(Object)
		)
		expect(localStorage.getItem("visiocirkit.componentDrawer.visibleCategories")).toBe(
			'["shape:basic","shape-item:basic:ellipse","shape:flowchart","shape-item:flowchart:decision","component:Wiring","component-item:Wiring:junction","component:Block diagram","component-item:Block diagram:amp"]'
		)
	})

	it("toggles category selection when clicking the category name", async () => {
		document.body.innerHTML = `
			<div id="leftOffcanvas"></div>
			<div id="leftOffcanvasAccordion"></div>
			<input id="componentFilterInput" />
			<button id="filterRegexButton"></button>
			<button id="addCategoryButton"></button>
			<button id="shapeLibraryMoreButton"></button>
			<div id="shapeLibraryCategoryList"></div>
			<input type="checkbox" id="shapeLibraryRememberCheckbox" />
			<button id="shapeLibraryApplyButton"></button>
			<div id="invalid-feedback-text"></div>
		`
		localStorage.clear()

		const componentLibraryController = {
			bindToolbar: vi.fn(),
			render: vi.fn(),
		}
		const shapeLibraryController = {
			getCategories: () => [
				{ id: "basic", name: "Basic", items: [{ id: "ellipse", name: "Ellipse" }] },
			],
			render: vi.fn(),
		}
		const controller = new AddComponentOffcanvasController({
			componentLibraryController: componentLibraryController as any,
			shapeLibraryController: shapeLibraryController as any,
			symbolLibraryMenuController: { openAndExecute: vi.fn() } as any,
			hideDrawer: vi.fn(),
			switchToPanMode: vi.fn(),
			switchToComponentMode: vi.fn(),
			cancelComponentPlacement: vi.fn(),
			placeComponent: vi.fn(),
			openPrompt: vi.fn(),
			openRenameModal: vi.fn(),
			openConfirm: vi.fn(),
			addCustomCategory: vi.fn().mockResolvedValue(undefined),
			loadCustomCategories: vi.fn().mockResolvedValue(undefined),
			getCustomCategoryNames: () => [],
			getSymbolByName: vi.fn(),
			openSymbolEditor: vi.fn(),
			renameCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			deleteCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			addSymbolToCategory: vi.fn().mockResolvedValue(undefined),
			duplicateSymbol: vi.fn().mockResolvedValue(undefined),
		})

		await controller.initialize(
			document.getElementById("leftOffcanvas") as HTMLDivElement,
			document.getElementById("leftOffcanvasAccordion") as HTMLDivElement,
			[{ tikzName: "amp", groupName: "Block diagram" } as any]
		)

		;(document.getElementById("shapeLibraryMoreButton") as HTMLButtonElement).click()
		document.querySelector<HTMLLabelElement>(".shape-library-category-option label")!.click()
		;(document.getElementById("shapeLibraryApplyButton") as HTMLButtonElement).click()

		expect(componentLibraryController.render).toHaveBeenLastCalledWith(
			document.getElementById("leftOffcanvasAccordion"),
			[{ tikzName: "amp", groupName: "Block diagram" }],
			expect.any(Object)
		)
		expect(shapeLibraryController.render).toHaveBeenLastCalledWith(
			document.getElementById("leftOffcanvasAccordion"),
			expect.any(Object),
			[],
			[]
		)
	})

	it("renders foldable category sections with component previews", async () => {
		document.body.innerHTML = `
			<div id="leftOffcanvas"></div>
			<div id="leftOffcanvasAccordion"></div>
			<input id="componentFilterInput" />
			<button id="filterRegexButton"></button>
			<button id="addCategoryButton"></button>
			<button id="shapeLibraryMoreButton"></button>
			<div id="shapeLibraryCategoryList"></div>
			<input type="checkbox" id="shapeLibraryRememberCheckbox" />
			<button id="shapeLibraryApplyButton"></button>
			<div id="invalid-feedback-text"></div>
		`
		localStorage.clear()

		const componentLibraryController = {
			bindToolbar: vi.fn(),
			render: vi.fn(),
		}
		const shapeLibraryController = {
			getCategories: () => [
				{ id: "basic", name: "Basic", items: [{ id: "ellipse", name: "Ellipse" }] },
			],
			render: vi.fn((root: HTMLDivElement) => {
				const item = root.appendChild(document.createElement("div"))
				item.classList.add("shape-library-accordion-item")
			}),
			renderPreview: vi.fn(() => document.createElementNS("http://www.w3.org/2000/svg", "svg")),
		}
		const controller = new AddComponentOffcanvasController({
			componentLibraryController: componentLibraryController as any,
			shapeLibraryController: shapeLibraryController as any,
			symbolLibraryMenuController: { openAndExecute: vi.fn() } as any,
			hideDrawer: vi.fn(),
			switchToPanMode: vi.fn(),
			switchToComponentMode: vi.fn(),
			cancelComponentPlacement: vi.fn(),
			placeComponent: vi.fn(),
			openPrompt: vi.fn(),
			openRenameModal: vi.fn(),
			openConfirm: vi.fn(),
			addCustomCategory: vi.fn().mockResolvedValue(undefined),
			loadCustomCategories: vi.fn().mockResolvedValue(undefined),
			getCustomCategoryNames: () => [],
			getSymbolByName: vi.fn(),
			openSymbolEditor: vi.fn(),
			renameCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			deleteCustomGraphicsSymbol: vi.fn().mockResolvedValue(undefined),
			addSymbolToCategory: vi.fn().mockResolvedValue(undefined),
			duplicateSymbol: vi.fn().mockResolvedValue(undefined),
		})

		await controller.initialize(
			document.getElementById("leftOffcanvas") as HTMLDivElement,
			document.getElementById("leftOffcanvasAccordion") as HTMLDivElement,
			[{ tikzName: "amp", displayName: "Amplifier", groupName: "Block diagram", symbolElement: { id: () => "symbol-amp" }, viewBox: { width: 17, height: 12 } } as any]
		)

		;(document.getElementById("shapeLibraryMoreButton") as HTMLButtonElement).click()
		const toggles = document.querySelectorAll<HTMLButtonElement>(".shape-library-category-toggle")
		const categoryRows = document.querySelectorAll<HTMLDivElement>(".shape-library-category-option")
		const itemLists = document.querySelectorAll<HTMLDivElement>(".shape-library-item-list")
		expect(toggles).toHaveLength(2)
		expect(itemLists[0].hidden).toBe(true)
		expect(toggles[0].getAttribute("aria-expanded")).toBe("false")
		expect(document.querySelectorAll(".shape-library-preview")).toHaveLength(2)

		categoryRows[0].click()

		expect(itemLists[0].hidden).toBe(false)
		expect(toggles[0].getAttribute("aria-expanded")).toBe("true")

		categoryRows[0].click()

		expect(itemLists[0].hidden).toBe(true)
		expect(toggles[0].getAttribute("aria-expanded")).toBe("false")
	})
})
