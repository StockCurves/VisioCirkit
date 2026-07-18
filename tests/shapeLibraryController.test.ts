import { beforeEach, describe, expect, it, vi } from "vitest"

class MockSvgNode {
	addTo() { return this }
	viewbox() { return this }
	line() { return this }
	circle() { return this }
	rect() { return this }
	radius() { return this }
	ellipse() { return this }
	path() { return this }
	polygon() { return this }
	polyline() { return this }
	text() { return this }
	fill() { return this }
	stroke() { return this }
	center() { return this }
	move() { return this }
	rotate() { return this }
}

vi.mock("@svgdotjs/svg.js", () => ({
	extend: vi.fn(),
	SVG: vi.fn(() => new MockSvgNode()),
	Point: class {
		constructor(public x = 0, public y = 0) {}
	},
}))

vi.mock("../src/scripts/internal", () => ({
	CircuitComponent: class {},
	EllipseComponent: class {},
	FlowchartConnectorComponent: class {},
	FlowchartDatabaseComponent: class {},
	FlowchartDecisionComponent: class {},
	FlowchartDocumentComponent: class {},
	FlowchartInputOutputComponent: class {},
	FlowchartOffPageConnectorComponent: class {},
	FlowchartSubprocessComponent: class {},
	FlowchartTerminatorComponent: class {},
	OpenComponent: class {},
	PolygonComponent: class {},
	RectangleComponent: class {},
	ShortComponent: class {},
	WireComponent: class {},
	defaultStroke: "#000000",
}))

vi.mock("../src/scripts/internal.ts", () => ({
	CircuitComponent: class {},
	EllipseComponent: class {},
	FlowchartConnectorComponent: class {},
	FlowchartDatabaseComponent: class {},
	FlowchartDecisionComponent: class {},
	FlowchartDocumentComponent: class {},
	FlowchartInputOutputComponent: class {},
	FlowchartOffPageConnectorComponent: class {},
	FlowchartSubprocessComponent: class {},
	FlowchartTerminatorComponent: class {},
	OpenComponent: class {},
	PolygonComponent: class {},
	RectangleComponent: class {},
	ShortComponent: class {},
	WireComponent: class {},
	defaultStroke: "#000000",
}))

vi.mock("../src/scripts/components/flowchartComponentFactory", () => ({
	createFlowchartComponent: vi.fn((kind: string) => ({ kind })),
}))

vi.mock("../src/scripts/utils/impSVGNumber", () => ({}))

import { EllipseComponent, ShortComponent } from "../src/scripts/internal"
import { ShapeLibraryController } from "../src/scripts/controllers/shapeLibraryController"

describe("ShapeLibraryController", () => {
	beforeEach(() => {
		localStorage.clear()
		document.body.innerHTML = `
			<button id="shapeLibraryMoreButton"></button>
			<div id="shapeLibraryModal">
				<div id="shapeLibraryCategoryList"></div>
				<input type="checkbox" id="shapeLibraryRememberCheckbox" />
				<button id="shapeLibraryApplyButton"></button>
			</div>
		`
	})

	it("renders the basic shape palette", () => {
		const controller = new ShapeLibraryController()
		const root = document.createElement("div")

		controller.render(root, {
			hideDrawer: vi.fn(),
			switchToPanMode: vi.fn(),
			switchToComponentMode: vi.fn(),
			cancelComponentPlacement: vi.fn(),
			placeComponent: vi.fn(),
		})

		const buttons = root.querySelectorAll(".libComponent")
		expect(root.querySelectorAll(".accordion-item")).toHaveLength(2)
		expect(buttons.length).toBe(19)
		expect((buttons[0] as HTMLDivElement).title).toBe("Short")
		expect((buttons[4] as HTMLDivElement).title).toBe("Ellipse")
		expect((buttons[9] as HTMLDivElement).title).toBe("Start / End")
		expect((buttons[13] as HTMLDivElement).title).toBe("Flow Arrow")
		expect((buttons[14] as HTMLDivElement).title).toBe("Document")
		expect((buttons[18] as HTMLDivElement).title).toBe("Off-page Connector")
	})

	it("renders only the selected shape categories", () => {
		const controller = new ShapeLibraryController()
		const root = document.createElement("div")

		controller.render(root, {
			hideDrawer: vi.fn(),
			switchToPanMode: vi.fn(),
			switchToComponentMode: vi.fn(),
			cancelComponentPlacement: vi.fn(),
			placeComponent: vi.fn(),
		}, ["flowchart"])

		const headers = Array.from(root.querySelectorAll(".accordion-button")).map((button) => (button as HTMLButtonElement).innerText)
		expect(headers).toEqual(["Flowchart"])
		expect(root.querySelectorAll(".libComponent")).toHaveLength(10)
	})

	it("applies category choices from the More Shapes dialog and remembers them", () => {
		const controller = new ShapeLibraryController()
		const root = document.createElement("div")
		const callbacks = {
			hideDrawer: vi.fn(),
			switchToPanMode: vi.fn(),
			switchToComponentMode: vi.fn(),
			cancelComponentPlacement: vi.fn(),
			placeComponent: vi.fn(),
		}

		controller.render(root, callbacks)
		;(document.getElementById("shapeLibraryMoreButton") as HTMLButtonElement).click()

		const basicCheckbox = document.querySelector<HTMLInputElement>('input[value="basic"]')
		const flowchartCheckbox = document.querySelector<HTMLInputElement>('input[value="flowchart"]')
		expect(basicCheckbox?.checked).toBe(true)
		expect(flowchartCheckbox?.checked).toBe(true)

		basicCheckbox!.checked = false
		;(document.getElementById("shapeLibraryRememberCheckbox") as HTMLInputElement).checked = true
		;(document.getElementById("shapeLibraryApplyButton") as HTMLButtonElement).click()

		const headers = Array.from(root.querySelectorAll(".accordion-button")).map((button) => (button as HTMLButtonElement).innerText)
		expect(headers).toEqual(["Flowchart"])
		expect(localStorage.getItem("visiocirkit.shapeLibrary.visibleCategories")).toBe('["flowchart"]')
	})

	it("loads remembered category choices when rendering the drawer", () => {
		localStorage.setItem("visiocirkit.shapeLibrary.rememberCategories", "true")
		localStorage.setItem("visiocirkit.shapeLibrary.visibleCategories", '["basic"]')
		const controller = new ShapeLibraryController()
		const root = document.createElement("div")

		controller.render(root, {
			hideDrawer: vi.fn(),
			switchToPanMode: vi.fn(),
			switchToComponentMode: vi.fn(),
			cancelComponentPlacement: vi.fn(),
			placeComponent: vi.fn(),
		})

		const headers = Array.from(root.querySelectorAll(".accordion-button")).map((button) => (button as HTMLButtonElement).innerText)
		expect(headers).toEqual(["Basic"])
	})

	it("places the expected component type when a shape is clicked", () => {
		const controller = new ShapeLibraryController()
		const root = document.createElement("div")
		const hideDrawer = vi.fn()
		const switchToPanMode = vi.fn()
		const switchToComponentMode = vi.fn()
		const cancelComponentPlacement = vi.fn()
		const placeComponent = vi.fn()

		controller.render(root, {
			hideDrawer,
			switchToPanMode,
			switchToComponentMode,
			cancelComponentPlacement,
			placeComponent,
		})

		;(root.querySelectorAll(".libComponent")[0] as HTMLDivElement).dispatchEvent(
			new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0 })
		)
		expect(switchToPanMode).toHaveBeenCalled()
		expect(hideDrawer).toHaveBeenCalled()
		expect(placeComponent.mock.calls[0][0]).toBeInstanceOf(ShortComponent)

		;(root.querySelectorAll(".libComponent")[4] as HTMLDivElement).dispatchEvent(
			new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0 })
		)
		expect(switchToComponentMode).toHaveBeenCalled()
		expect(cancelComponentPlacement).toHaveBeenCalled()
		expect(placeComponent.mock.calls[1][0]).toBeInstanceOf(EllipseComponent)

		;(root.querySelectorAll(".libComponent")[11] as HTMLDivElement).dispatchEvent(
			new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0 })
		)
		expect(placeComponent.mock.calls[2][0]).toEqual({ kind: "decision" })
	})
})
