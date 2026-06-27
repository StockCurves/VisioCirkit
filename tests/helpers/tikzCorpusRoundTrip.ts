import fs from "fs"
import path from "path"
import * as SVG from "@svgdotjs/svg.js"
import { fakeCanvas, fakeElement } from "../setup"
import { CircuitComponent } from "../../src/scripts/components/circuitComponent"
import { configureComponentRuntime } from "../../src/scripts/components/componentRuntime"
import { CanvasController } from "../../src/scripts/controllers/canvasController"
import { EnvironmentVariableController } from "../../src/scripts/controllers/environmentVariableController"
import { MainController } from "../../src/scripts/controllers/mainController"
import { SaveController, currentSaveVersion } from "../../src/scripts/controllers/saveController"
import { LatexRenderService, prepareLatexSource } from "../../src/scripts/services/latexRenderService"
import { configureTikzParserRuntime, parseTikz } from "../../src/scripts/utils/tikzParser"

export type TikzCorpusStatus =
	| "PASS_WITH_NORMALIZATION"
	| "PARSER_WARNING"
	| "PARSER_EXCEPTION"
	| "FROM_JSON_EXCEPTION"
	| "SERIALIZER_EXCEPTION"
	| "ROUNDTRIP_MISMATCH"
	| "USER_INPUT_LATEX_ERROR"
	| "SERIALIZED_LATEX_ERROR"

export type LabelEvidence = {
	file: string
	line: number
	kind: "path-label" | "node-label" | "font-or-math" | "ctikzset"
	source: string
}

export type TikzCorpusResult = {
	file: string
	statuses: TikzCorpusStatus[]
	componentCount: number
	warnings: Array<{ message: string; lines: [number, number] }>
	labels: LabelEvidence[]
	serializedTikz: string
	error?: string
	render: {
		original: "skipped" | "ok" | "error"
		serialized: "skipped" | "ok" | "error"
	}
}

type SymbolLike = {
	tikzName: string
	displayName: string
	componentClass: string
	source: false | "isVoltage" | "isCurrent"
	isNodeSymbol: boolean
	possibleOptions: Array<{ name: string; displayName?: string }>
	possibleEnumOptions: unknown[]
	_mapping: Map<string, any>
	getVariant: () => any
	optionsToStringArray: (options: Array<{ name: string }>) => string[]
	getOptionsFromOptionNames: (options: string[]) => Array<{ name: string; displayName?: string }>
}

let cachedSymbols: SymbolLike[] | null = null

export function listTikzCorpusFiles(root = process.cwd()): string[] {
	const dir = path.join(root, "sch2tikz-out")
	if (!fs.existsSync(dir)) return []
	return fs
		.readdirSync(dir)
		.filter((name) => name.endsWith(".tikz"))
		.map((name) => path.join(dir, name))
		.sort()
}

export function setupTikzRoundTripRuntime(): SymbolLike[] {
	const components: CircuitComponent[] = []
	;(CanvasController as any).instance = { canvas: fakeCanvas }
	;(MainController as any)._instance = {
		symbols: loadSymbolMetadata(),
		circuitComponents: components,
		isMac: false,
		darkMode: false,
	}
	;(SaveController as any)._instance = { currentlyLoadedSaveVersion: currentSaveVersion }
	;(EnvironmentVariableController as any)._instance = {
		getGlobalSettings: () => ({
			labelOrientation: "smart",
			voltageConvention: "old",
			voltageStyle: "RP",
		}),
		getTikzSettings: () => ({ environment: [], ctikzset: [] }),
	}
	configureComponentRuntime({
		registerComponent: (component) => components.push(component as CircuitComponent),
		removeComponent: (component) => {
			const index = components.indexOf(component as CircuitComponent)
			if (index >= 0) components.splice(index, 1)
		},
		createSelectionElement: () => fakeElement() as any,
		createVisualizationGroup: () => fakeElement() as any,
		putSelectionElement: () => {},
		setSnapCursorVisible: () => {},
		snapDrag: () => {},
		bringToForeground: () => {},
		sendToBackground: () => {},
		moveForward: () => {},
		moveBackward: () => {},
		addUndoState: () => {},
		getSelectionReference: () => null,
		setSelectionReference: () => {},
		getSelectedCount: () => 0,
	})
	configureTikzParserRuntime({
		getSymbols: () => loadSymbolMetadata() as any,
		addParsedSubcircuit: () => {},
	})
	return loadSymbolMetadata()
}

export async function analyzeTikzFile(filePath: string): Promise<TikzCorpusResult> {
	setupTikzRoundTripRuntime()
	const source = fs.readFileSync(filePath, "utf-8")
	const relativeFile = path.relative(process.cwd(), filePath)
	const labels = extractLabelEvidence(relativeFile, source)
	const result: TikzCorpusResult = {
		file: relativeFile,
		statuses: ["PASS_WITH_NORMALIZATION"],
		componentCount: 0,
		warnings: [],
		labels,
		serializedTikz: "",
		render: { original: "skipped", serialized: "skipped" },
	}

	result.render.original = await renderTikzIfEnabled(source)
	if (result.render.original === "error") {
		result.statuses = ["USER_INPUT_LATEX_ERROR"]
		result.error = "Original TikZ failed optional QuickLaTeX render; inspect highlighted label/parser lines and LaTeX output."
		return result
	}

	let parsed: any[]
	try {
		parsed = parseTikz(source)
	} catch (error: any) {
		result.statuses = ["PARSER_EXCEPTION"]
		result.error = error?.message ?? String(error)
		return result
	}

	const components: CircuitComponent[] = []
	for (const obj of parsed) {
		if (obj.type === "parse_error") {
			result.warnings.push({ message: obj.message, lines: obj.lines })
			continue
		}
		try {
			const component = CircuitComponent.fromJson(obj)
			if (component) components.push(component)
		} catch (error: any) {
			result.statuses = ["FROM_JSON_EXCEPTION"]
			result.error = `${obj.type}: ${error?.message ?? String(error)}`
			return result
		}
	}

	result.componentCount = components.length
	if (result.warnings.length > 0) result.statuses = ["PARSER_WARNING"]

	try {
		result.serializedTikz = components.map((component) => component.toTikzString()).join("\n")
	} catch (error: any) {
		result.statuses = ["SERIALIZER_EXCEPTION"]
		result.error = error?.message ?? String(error)
		return result
	}

	result.render.serialized = await renderTikzIfEnabled(result.serializedTikz)
	if (result.render.serialized === "error") {
		result.statuses = ["SERIALIZED_LATEX_ERROR"]
		result.error = "Serialized TikZ failed optional QuickLaTeX render."
	}

	return result
}

export function extractLabelEvidence(file: string, tikz: string): LabelEvidence[] {
	const evidence: LabelEvidence[] = []
	const lines = tikz.split(/\r?\n/)
	lines.forEach((line, index) => {
		const lineNumber = index + 1
		if (/\\ctikzset\s*\{/.test(line)) {
			evidence.push({ file, line: lineNumber, kind: "ctikzset", source: line.trim() })
		}
		if (/\bto\s*\[[^\]]*\bl_?\s*=/.test(line)) {
			evidence.push({ file, line: lineNumber, kind: "path-label", source: line.trim() })
		}
		if (!line.includes("\\begin{circuitikz}") && /(?:\\node\b|\bnode\s*(?:\[[^\]]*\])?\s*(?:at\s*\([^)]+\)\s*)?\{.*\})/.test(line)) {
			evidence.push({ file, line: lineNumber, kind: "node-label", source: line.trim() })
		}
		if (/\\(?:tiny|scriptsize|footnotesize|small|normalsize|large|Large|LARGE|huge|Huge)\b|\$|\\mathbf|\\textcolor/.test(line)) {
			evidence.push({ file, line: lineNumber, kind: "font-or-math", source: line.trim() })
		}
	})
	return evidence
}

export function writeTikzCorpusReport(results: TikzCorpusResult[], reportPath = path.join(process.cwd(), "coverage", "tikz-corpus-report.md")) {
	fs.mkdirSync(path.dirname(reportPath), { recursive: true })
	const lines = [
		"# TikZ Corpus Round-Trip Report",
		"",
		`Generated: ${new Date().toISOString()}`,
		`Render backend: ${process.env.TIKZ_CORPUS_RENDER || "skipped"}`,
		"",
	]
	for (const result of results) {
		lines.push(`## ${result.file}`)
		lines.push(`- Status: ${result.statuses.join(", ")}`)
		lines.push(`- Components: ${result.componentCount}`)
		lines.push(`- Render: original=${result.render.original}, serialized=${result.render.serialized}`)
		if (result.error) lines.push(`- Error: ${result.error}`)
		for (const warning of result.warnings) {
			lines.push(`- Highlight lines ${warning.lines[0]}-${warning.lines[1]}: ${warning.message}`)
		}
		if (result.labels.length > 0) {
			lines.push("- Label evidence:")
			for (const label of result.labels.slice(0, 20)) {
				lines.push(`  - L${label.line} ${label.kind}: \`${label.source.replaceAll("`", "\\`")}\``)
			}
		}
		lines.push("")
	}
	fs.writeFileSync(reportPath, lines.join("\n"), "utf-8")
	return reportPath
}

async function renderTikzIfEnabled(tikz: string): Promise<"skipped" | "ok" | "error"> {
	if (process.env.TIKZ_CORPUS_RENDER !== "quicklatex") return "skipped"
	try {
		const prepared = prepareLatexSource(tikz)
		await new LatexRenderService(process.env.TIKZ_CORPUS_API_BASE ?? "").renderViaQuickLaTeX(
			prepared.bodyCode,
			prepared.libraries
		)
		return "ok"
	} catch {
		return "error"
	}
}

function loadSymbolMetadata(): SymbolLike[] {
	if (cachedSymbols) return cachedSymbols
	const svgPath = path.join(process.cwd(), "src", "data", "symbols.svg")
	const document = new DOMParser().parseFromString(fs.readFileSync(svgPath, "utf-8"), "image/svg+xml")
	cachedSymbols = Array.from(document.getElementsByTagName("component")).map((component) => buildSymbolLike(component))
	return cachedSymbols
}

function buildSymbolLike(component: Element): SymbolLike {
	const firstVariant = component.getElementsByTagName("variant")[0]
	const options = Array.from(component.querySelectorAll(":scope > options > option")).map((option) => ({
		name: option.getAttribute("name") ?? "",
		displayName: option.getAttribute("display") ?? undefined,
	}))
	const variant = buildVariant(firstVariant)
	const mapping = new Map<string, any>([["", variant]])
	return {
		tikzName: component.getAttribute("tikz") ?? "",
		displayName: component.getAttribute("display") ?? component.getAttribute("tikz") ?? "",
		componentClass: component.getAttribute("class") ?? "",
		source: (component.getAttribute("source") as any) || false,
		isNodeSymbol: component.getAttribute("type") === "node",
		possibleOptions: options,
		possibleEnumOptions: [],
		_mapping: mapping,
		getVariant: () => variant,
		optionsToStringArray: (selectedOptions) => selectedOptions.map((option) => option.name).sort(),
		getOptionsFromOptionNames: (names) => names.map((name) => options.find((option) => option.name === name) ?? { name }),
	}
}

function buildVariant(variantElement: Element | undefined) {
	const viewBox = new SVG.Box(variantElement?.getAttribute("viewBox") ?? "0 0 10 10")
	const pins = Array.from(variantElement?.getElementsByTagName("pin") ?? []).map((pin) => buildAnchor(pin))
	if (pins.length === 0) {
		pins.push({
			name: "center",
			x: new SVG.Number(0),
			y: new SVG.Number(0),
			isDefault: true,
			point: new SVG.Point(0, 0),
		})
	}
	const defaultAnchor = pins.find((pin) => pin.isDefault) ?? pins[0]
	const textPositionElement = variantElement?.getElementsByTagName("textpos")[0]
	const textPosition = textPositionElement ? buildAnchor(textPositionElement) : defaultAnchor
	return {
		mid: new SVG.Point(
			Number(variantElement?.getAttribute("x") ?? viewBox.cx),
			Number(variantElement?.getAttribute("y") ?? viewBox.cy)
		),
		viewBox,
		options: [],
		symbol: { id: () => variantElement?.getAttribute("for") ?? "test-symbol" },
		pins,
		textPosition,
		defaultAnchor,
		maxStroke: 0,
	}
}

function buildAnchor(anchorElement: Element) {
	const x = new SVG.Number(anchorElement.getAttribute("x") ?? "0")
	const y = new SVG.Number(anchorElement.getAttribute("y") ?? "0")
	return {
		name: anchorElement.getAttribute("name") || anchorElement.getAttribute("anchorname") || undefined,
		x,
		y,
		isDefault: anchorElement.getAttribute("isDefault") === "true" || anchorElement.getAttribute("isdefault") === "true",
		point: new SVG.Point(x.value, y.value),
	}
}
