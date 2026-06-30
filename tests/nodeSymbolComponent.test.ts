import { describe, expect, it, vi } from "vitest"
import * as SVG from "@svgdotjs/svg.js"
import { fakeCanvas } from "./setup"
import { CanvasController } from "../src/scripts/controllers/canvasController"
import { NodeSymbolComponent } from "../src/scripts/components/nodeSymbolComponent"

function makeVariant(optionNames: string[] = []) {
	return {
		mid: new SVG.Point(0, 0),
		viewBox: new SVG.Box(0, 0, 10, 10),
		options: optionNames.map((name) => ({ name })),
		symbol: { id: () => `node_pmos${optionNames.length ? "_" + optionNames.join("_") : ""}` },
		pins: [],
		textPosition: { point: new SVG.Point(0, 0) },
		defaultAnchor: { point: new SVG.Point(0, 0) },
		maxStroke: 0,
	}
}

function makePmosSymbol() {
	const options = [{ name: "nocircle" }, { name: "emptycircle" }]
	const variants = new Map([
		["", makeVariant()],
		["emptycircle", makeVariant(["emptycircle"])],
		["nocircle", makeVariant(["nocircle"])],
	])

	return {
		tikzName: "pmos",
		displayName: "pmos",
		possibleOptions: [],
		possibleEnumOptions: [{ displayName: "Circle", selectNone: true, options }],
		getVariant: vi.fn((selectedOptions) => {
			const key = selectedOptions.map((option: { name: string }) => option.name).sort().join(", ")
			return variants.get(key)
		}),
		optionsToStringArray: (selectedOptions: Array<{ name: string }>) =>
			selectedOptions.map((option) => option.name).sort(),
		getOptionsFromOptionNames: (names: string[]) => names.map((name) => options.find((option) => option.name === name) ?? { name }),
	} as any
}

describe("NodeSymbolComponent", () => {
	it("uses emptycircle as the default pmos variant", () => {
		;(CanvasController as any).instance = { canvas: fakeCanvas }

		const component = new NodeSymbolComponent(makePmosSymbol())

		expect(component.toJson().options).toEqual(["emptycircle"])
		expect(component.toTikzString()).toContain("\\node[pmos, emptycircle]")
	})
})
