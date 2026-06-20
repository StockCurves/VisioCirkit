import { describe, expect, it, vi } from "vitest"

class MockSvgNode {
	addTo() { return this }
	viewbox() { return this }
	line() { return this }
	circle() { return this }
	rect() { return this }
	ellipse() { return this }
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
	OpenComponent: class {},
	PolygonComponent: class {},
	RectangleComponent: class {},
	ShortComponent: class {},
	WireComponent: class {},
	defaultStroke: "#000000",
}))

vi.mock("../src/scripts/utils/impSVGNumber", () => ({}))

import { EllipseComponent, ShortComponent } from "../src/scripts/internal"
import { ShapeLibraryController } from "../src/scripts/controllers/shapeLibraryController"

describe("ShapeLibraryController", () => {
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
		expect(buttons.length).toBe(9)
		expect((buttons[0] as HTMLDivElement).title).toBe("Short")
		expect((buttons[4] as HTMLDivElement).title).toBe("Ellipse")
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
	})
})
