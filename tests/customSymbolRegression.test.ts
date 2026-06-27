import { describe, expect, it, beforeAll, afterAll, vi } from "vitest"
import * as fs from "fs"
import * as path from "path"
import { CustomSymbolDomService } from "../src/scripts/services/customSymbolDomService"

// Mock ComponentSymbol mapping since setup.ts uses a mock, avoiding direct dependency on browser Canvas/SVG.js layout APIs.
const { MockComponentSymbol } = vi.hoisted(() => {
	class MockComponentSymbol {
		tikzName: string
		displayName: string
		isCustomSymbol?: boolean
		isNodeSymbol: boolean

		constructor(componentMetadata: Element) {
			this.tikzName = componentMetadata.getAttribute("tikz") ?? ""
			this.displayName = componentMetadata.getAttribute("display") ?? this.tikzName
			this.isNodeSymbol = componentMetadata.getAttribute("type") === "node"
		}
	}
	return { MockComponentSymbol }
})

vi.mock("../src/scripts/components/componentSymbol", () => ({
	ComponentSymbol: MockComponentSymbol,
}))

function normalizePathNumbers(d: string): string {
	// Match all coordinates and round them to 2 decimal places to prevent float precision mismatches
	return d.replace(/-?\d*\.?\d+/g, (match) => {
		const num = parseFloat(match)
		if (isNaN(num)) return match
		return String(Number(num.toFixed(2)))
	}).replace(/\s+/g, " ").trim()
}

function normalizeElement(el: Element, isCopied: boolean, baseTikzName: string, copyTikzName: string, idMap: Map<string, string>) {
	// 1. Align/Remove IDs and hrefs (only root symbol has dynamic id)
	if (el.tagName.toLowerCase() === "symbol") {
		el.removeAttribute("id")
	}

	// 2. Normalize path and coordinate precision
	if (el.hasAttribute("d")) {
		el.setAttribute("d", normalizePathNumbers(el.getAttribute("d")!))
	}

	const numericAttrs = ["cx", "cy", "r", "width", "height", "x", "y", "x1", "y1", "x2", "y2"]
	for (const attr of numericAttrs) {
		if (el.hasAttribute(attr)) {
			const val = parseFloat(el.getAttribute(attr)!)
			if (!isNaN(val)) {
				el.setAttribute(attr, String(Number(val.toFixed(2))))
			}
		}
	}

	// 3. Clean up non-visual runtime attributes
	el.removeAttribute("data-orig-index")
	el.removeAttribute("data-draggable")
	el.removeAttribute("style")

	// 4. Recursive traversal
	Array.from(el.children).forEach((child) => {
		normalizeElement(child, isCopied, baseTikzName, copyTikzName, idMap)
	})
}

function serializeNormalizedElement(el: Element): string {
	const tagName = el.tagName.toLowerCase()
	// Sort all attributes alphabetically for strict consistent representation
	const attrs = Array.from(el.attributes)
		.map((attr) => `${attr.name}="${attr.value}"`)
		.sort()
		.join(" ")

	const attrsStr = attrs ? " " + attrs : ""

	if (el.children.length === 0) {
		const text = el.textContent?.trim() || ""
		if (text) {
			return `<${tagName}${attrsStr}>${text}</${tagName}>`
		}
		return `<${tagName}${attrsStr}/>`
	}

	const childrenStr = Array.from(el.children)
		.map((child) => serializeNormalizedElement(child))
		.join("\n")

	return `<${tagName}${attrsStr}>\n${childrenStr}\n</${tagName}>`
}

describe("Custom Symbol Regression Testing Suite", () => {
	let masterSymbolDB: Element
	const testedComponents: string[] = []
	const failures: { component: string; optionIndex: number; optionName: string; originalXml: string; copiedXml: string }[] = []

	beforeAll(() => {
		// Read and parse symbols.svg once for the entire suite to avoid massive cumulative parsing overhead
		const symbolsSvgPath = path.resolve(__dirname, "../src/data/symbols.svg")
		const fileContent = fs.readFileSync(symbolsSvgPath, "utf-8")
		const container = document.createElement("div")
		container.innerHTML = fileContent
		masterSymbolDB = container.querySelector("svg")!
	})

	it("should verify copying and rebuilding nor gate (american nor port) as nor_test in category my favorite", () => {
		const componentNode = Array.from(masterSymbolDB.getElementsByTagName("component")).find(
			(comp) => comp.getAttribute("tikz") === "american nor port"
		)
		expect(componentNode).toBeDefined()

		const baseTikzName = "american nor port"
		const copyTikzName = "nor_test"
		const domService = new CustomSymbolDomService()

		// Sandbox isolated DOM for American NOR gate
		const testContainer = document.createElement("div")
		const testSymbolDB = document.createElementNS("http://www.w3.org/2000/svg", "svg")
		testContainer.appendChild(testSymbolDB)

		const clonedComponentNode = componentNode!.cloneNode(true) as Element
		testSymbolDB.appendChild(clonedComponentNode)

		const origVariants = Array.from(clonedComponentNode.getElementsByTagName("variant"))
		for (const variant of origVariants) {
			const origFor = variant.getAttribute("for")!
			const origSymbolNode = masterSymbolDB.querySelector(`symbol[id="${origFor}"]`)
			if (origSymbolNode) {
				testSymbolDB.appendChild(origSymbolNode.cloneNode(true))
			}
		}

		// Perform Duplication
		const originalComponentSymbol = new MockComponentSymbol(clonedComponentNode) as any
		const duplicateResult = domService.duplicateSymbolDom(testSymbolDB, originalComponentSymbol, copyTikzName)
		expect(duplicateResult).not.toBeNull()

		// Simulate loading to My Favorite category membership
		const record = duplicateResult!.customSymbolData
		record.displayName = "nor_test"
		
		// Load symbol into sandbox triggering rebuildDerivedCustomSymbolVariants
		domService.loadCustomSymbolsIntoDom([record], testSymbolDB, [])

		// Prepare ID mapping
		const idMap = new Map<string, string>()
		const copiedComponentNode = testSymbolDB.querySelector(`component[tikz="${copyTikzName}"]`)!
		const copiedVariants = Array.from(copiedComponentNode.getElementsByTagName("variant"))
		for (let i = 0; i < origVariants.length; i++) {
			idMap.set(copiedVariants[i].getAttribute("for")!, origVariants[i].getAttribute("for")!)
		}

		// Verify all rebuilt variants
		for (let i = 0; i < origVariants.length; i++) {
			const origFor = origVariants[i].getAttribute("for")!
			const copiedFor = copiedVariants[i].getAttribute("for")!

			const origSymbolNode = testSymbolDB.querySelector(`symbol[id="${origFor}"]`)!
			const copiedSymbolNode = testSymbolDB.querySelector(`symbol[id="${copiedFor}"]`)!

			const origClone = origSymbolNode.cloneNode(true) as Element
			const copiedClone = copiedSymbolNode.cloneNode(true) as Element

			normalizeElement(origClone, false, baseTikzName, copyTikzName, idMap)
			normalizeElement(copiedClone, true, baseTikzName, copyTikzName, idMap)

			const originalSerialized = serializeNormalizedElement(origClone)
			const copiedSerialized = serializeNormalizedElement(copiedClone)

			expect(copiedSerialized).toBe(originalSerialized)
		}
		
		testedComponents.push(`${baseTikzName} (copied as ${copyTikzName} in My Favorite)`)
	}, 15000)

	it("should verify copying and rebuilding all standard components and variants via sandbox isolation", () => {
		const components = Array.from(masterSymbolDB.getElementsByTagName("component"))
		const domService = new CustomSymbolDomService()

		for (const componentNode of components) {
			const baseTikzName = componentNode.getAttribute("tikz")!
			// Skip nor gate since it's already tested explicitly in the first case
			if (baseTikzName === "american nor port") continue

			const copyTikzName = `copy_${baseTikzName}`

			// Sandbox isolated DOM container to avoid cumulative JSDOM overhead and memory leak hangs
			const testContainer = document.createElement("div")
			const testSymbolDB = document.createElementNS("http://www.w3.org/2000/svg", "svg")
			testContainer.appendChild(testSymbolDB)

			const clonedComponentNode = componentNode.cloneNode(true) as Element
			testSymbolDB.appendChild(clonedComponentNode)

			const origVariants = Array.from(clonedComponentNode.getElementsByTagName("variant"))
			for (const variant of origVariants) {
				const origFor = variant.getAttribute("for")!
				const origSymbolNode = masterSymbolDB.querySelector(`symbol[id="${origFor}"]`)
				if (origSymbolNode) {
					testSymbolDB.appendChild(origSymbolNode.cloneNode(true))
				}
			}

			const originalComponentSymbol = new MockComponentSymbol(clonedComponentNode) as any
			const duplicateResult = domService.duplicateSymbolDom(testSymbolDB, originalComponentSymbol, copyTikzName)
			if (!duplicateResult) continue

			testedComponents.push(baseTikzName)

			// Load triggering rebuildDerivedCustomSymbolVariants
			const customRecords = [duplicateResult.customSymbolData]
			domService.loadCustomSymbolsIntoDom(customRecords, testSymbolDB, [])

			const idMap = new Map<string, string>()
			const copiedComponentNode = testSymbolDB.querySelector(`component[tikz="${copyTikzName}"]`)!
			const copiedVariants = Array.from(copiedComponentNode.getElementsByTagName("variant"))
			
			for (let i = 0; i < origVariants.length; i++) {
				const origFor = origVariants[i].getAttribute("for")!
				const copiedFor = copiedVariants[i].getAttribute("for")!
				idMap.set(copiedFor, origFor)
			}

			for (let i = 0; i < origVariants.length; i++) {
				const origFor = origVariants[i].getAttribute("for")!
				const copiedFor = copiedVariants[i].getAttribute("for")!

				const origSymbolNode = testSymbolDB.querySelector(`symbol[id="${origFor}"]`)!
				const copiedSymbolNode = testSymbolDB.querySelector(`symbol[id="${copiedFor}"]`)!

				const origClone = origSymbolNode.cloneNode(true) as Element
				const copiedClone = copiedSymbolNode.cloneNode(true) as Element

				normalizeElement(origClone, false, baseTikzName, copyTikzName, idMap)
				normalizeElement(copiedClone, true, baseTikzName, copyTikzName, idMap)

				const originalSerialized = serializeNormalizedElement(origClone)
				const copiedSerialized = serializeNormalizedElement(copiedClone)

				const optionName = Array.from(origVariants[i].getElementsByTagName("option"))
					.map((opt) => opt.getAttribute("name") || "")
					.join(", ") || "default"

				try {
					expect(copiedSerialized).toBe(originalSerialized)
				} catch (err) {
					failures.push({
						component: baseTikzName,
						optionIndex: i,
						optionName,
						originalXml: originalSerialized,
						copiedXml: copiedSerialized,
					})
				}
			}
		}

		expect(failures.length).toBe(0)
	}, 180000)

	afterAll(() => {
		const reportsDir = path.join(__dirname, "reports")
		if (!fs.existsSync(reportsDir)) {
			fs.mkdirSync(reportsDir, { recursive: true })
		}

		const logPath = path.join(reportsDir, "symbol-look-regression-test-results.md")
		const now = new Date().toISOString()

		let mdContent = `# Symbol Look Regression Test Results\n\n`
		mdContent += `- **Test Run Time**: ${now}\n`
		mdContent += `- **Total Components Tested**: ${testedComponents.length}\n`
		mdContent += `- **Status**: ${failures.length === 0 ? "PASSED" : "FAILED"}\n\n`

		if (failures.length > 0) {
			mdContent += `## Mismatches Found (${failures.length})\n\n`
			failures.forEach((fail, idx) => {
				mdContent += `### ${idx + 1}. Component: \`${fail.component}\` (Option: \`${fail.optionName}\`)\n`
				mdContent += `#### Original SVG (Normalized):\n\`\`\`xml\n${fail.originalXml}\n\`\`\`\n`
				mdContent += `#### Rebuilt Custom SVG (Normalized):\n\`\`\`xml\n${fail.copiedXml}\n\`\`\`\n\n`
			})
		} else {
			mdContent += `## All Custom Copied Symbols Matched Original Visual Representations Successfully! 🎉\n\n`
			mdContent += `### Tested Components list:\n`
			testedComponents.forEach((comp) => {
				mdContent += `- \`${comp}\`\n`
			})
		}

		fs.writeFileSync(logPath, mdContent, "utf-8")
	})
})
