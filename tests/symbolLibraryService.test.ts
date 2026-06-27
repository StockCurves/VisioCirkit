import { beforeEach, describe, expect, it, vi } from "vitest"

const { MockSvg, MockComponentSymbol } = vi.hoisted(() => {
	class MockSvg {
		node: SVGSVGElement

		constructor(node: SVGSVGElement) {
			this.node = node
		}
	}

	class MockComponentSymbol {
		tikzName: string

		constructor(componentMetadata: Element) {
			this.tikzName = componentMetadata.getAttribute("tikz") ?? ""
		}
	}

	return { MockSvg, MockComponentSymbol }
})

vi.mock("@svgdotjs/svg.js", () => ({
	Svg: MockSvg,
}))

vi.mock("../src/scripts/components/componentSymbol", () => ({
	ComponentSymbol: MockComponentSymbol,
}))

vi.mock("../src/scripts/utils/domWatcher", () => ({
	waitForElementLoaded: vi.fn(),
}))

import { waitForElementLoaded } from "../src/scripts/utils/domWatcher"
import { SymbolLibraryService } from "../src/scripts/services/symbolLibraryService"

describe("SymbolLibraryService", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		document.body.innerHTML = `<link id="symbolDBlink" href="/symbols.svg" />`
	})

	it("loads the base symbol library into the DOM and extracts runtime symbols", async () => {
		;(waitForElementLoaded as any).mockResolvedValue(document.getElementById("symbolDBlink"))
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				text: vi.fn().mockResolvedValue(`
					<svg xmlns="http://www.w3.org/2000/svg">
						<component tikz="resistor"></component>
						<component tikz="capacitor"></component>
					</svg>
				`),
			})
		)

		const service = new SymbolLibraryService()
		const loaded = await service.loadIntoDocument()

		expect(fetch).toHaveBeenCalledWith("http://localhost:3000/symbols.svg", {
			method: "GET",
			mode: "cors",
			credentials: "same-origin",
		})
		expect(document.getElementById("symbolDB")).not.toBeNull()
		expect(loaded.symbols).toHaveLength(2)
		expect(loaded.symbols.map((symbol) => symbol.tikzName)).toEqual(["resistor", "capacitor"])
	})
})
