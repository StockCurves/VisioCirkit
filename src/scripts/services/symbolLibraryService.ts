import * as SVG from "@svgdotjs/svg.js"
import { ComponentSymbol } from "../components/componentSymbol"
import { waitForElementLoaded } from "../utils/domWatcher"

export type LoadedSymbolLibrary = {
	symbolsSVG: SVG.Svg
	symbols: ComponentSymbol[]
}

export class SymbolLibraryService {
	public async loadIntoDocument(): Promise<LoadedSymbolLibrary> {
		const symbolDBlink = (await waitForElementLoaded("symbolDBlink")) as HTMLLinkElement
		const response = await fetch(symbolDBlink.href, {
			method: "GET",
			mode: "cors",
			credentials: "same-origin",
		})
		const textContent = await response.text()
		const symbolsDocument = new DOMParser().parseFromString(textContent, "image/svg+xml")
		const symbolsSVGSVGElement = document.adoptNode(symbolsDocument.firstElementChild as SVGSVGElement)
		symbolsSVGSVGElement.style.display = "none"
		symbolsSVGSVGElement.setAttribute("id", "symbolDB")
		document.body.appendChild(symbolsSVGSVGElement)

		const symbolsSVG = new SVG.Svg(symbolsSVGSVGElement)
		const componentsMetadata = Array.from(symbolsSVG.node.getElementsByTagName("component"))

		return {
			symbolsSVG,
			symbols: componentsMetadata.flatMap((componentMetadata) => new ComponentSymbol(componentMetadata)),
		}
	}
}
