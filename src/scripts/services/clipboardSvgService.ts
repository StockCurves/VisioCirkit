import * as SVG from "@svgdotjs/svg.js"
import type { CircuitComponent } from "../components/circuitComponent"
import { defaultFill, defaultStroke } from "../utils/themeDefaults"

function cleanupSvg(svgObj: SVG.Svg): void {
	for (const removeElement of svgObj.find(
		':is([fill-opacity="0"],[fill="none"],[fill="transparent"]):is([stroke-opacity="0"],[stroke="none"],[stroke-width="0"],[stroke="transparent"])'
	)) {
		removeElement.remove()
	}
	for (const removeClass of svgObj.find(".draggable")) {
		removeClass.removeClass("draggable")
	}
}

export function createComponentsSvgText(components: CircuitComponent[]): string {
	const svgObj = new SVG.Svg()
	svgObj.node.style.fontSize = "10pt"
	svgObj.node.style.overflow = "visible"

	const defsMap: Map<string, SVG.Element> = new Map<string, SVG.Element>()
	const exportedComponents: SVG.Element[] = []
	for (const component of components) {
		exportedComponents.push(component.toSVG(defsMap))
	}

	if (defsMap.size > 0) {
		const defs = new SVG.Defs()
		for (const element of defsMap) {
			defs.add(element[1])
		}
		svgObj.add(defs)
	}

	for (const component of exportedComponents) {
		svgObj.add(component)
	}

	cleanupSvg(svgObj)

	const bbox = svgObj.bbox()
	if (bbox) {
		bbox.x -= 2
		bbox.y -= 2
		bbox.width += 4
		bbox.height += 4
		svgObj.viewbox(bbox)
	}

	const tempDiv = document.createElement("div")
	tempDiv.appendChild(svgObj.node)
	const svgText = tempDiv.innerHTML.replaceAll(defaultStroke, "#000").replaceAll(defaultFill, "#fff")
	tempDiv.remove()
	return svgText
}

function svgTextToHtml(svgText: string): string {
	return `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}">`
}

export async function writeSvgTextToClipboard(svgText: string): Promise<void> {
	const clipboard = navigator.clipboard
	if (!clipboard) {
		return
	}

	if (typeof ClipboardItem !== "undefined" && clipboard.write) {
		try {
			await clipboard.write([
				new ClipboardItem({
					"image/svg+xml": new Blob([svgText], { type: "image/svg+xml" }),
					"text/html": new Blob([svgTextToHtml(svgText)], { type: "text/html" }),
					"text/plain": new Blob([svgText], { type: "text/plain" }),
				}),
			])
			return
		} catch {
			// Some browsers expose ClipboardItem but reject image/svg+xml writes.
		}
	}

	if (clipboard.writeText) {
		await clipboard.writeText(svgText)
	}
}
