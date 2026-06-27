import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import {
	analyzeTikzFile,
	extractLabelEvidence,
	listTikzCorpusFiles,
	setupTikzRoundTripRuntime,
	writeTikzCorpusReport,
} from "./helpers/tikzCorpusRoundTrip"
import { tikzLabelCases } from "./fixtures/tikz-label-cases"
import { parseTikz } from "../src/scripts/utils/tikzParser"
import { CircuitComponent } from "../src/scripts/components/circuitComponent"

describe("sch2tikz-out TikZ corpus round-trip", () => {
	it("runs every user TikZ file through parse -> fromJson -> toTikzString without mutating inputs", async () => {
		const files = listTikzCorpusFiles()
		expect(files.length).toBeGreaterThan(0)

		const results = await Promise.all(files.map((file) => analyzeTikzFile(file)))
		const reportPath = writeTikzCorpusReport(results)

		expect(reportPath.endsWith("coverage\\tikz-corpus-report.md") || reportPath.endsWith("coverage/tikz-corpus-report.md")).toBe(true)
		expect(results.filter((result) => result.statuses.includes("PARSER_EXCEPTION"))).toEqual([])
		expect(results.filter((result) => result.statuses.includes("FROM_JSON_EXCEPTION"))).toEqual([])
		expect(results.filter((result) => result.statuses.includes("SERIALIZER_EXCEPTION"))).toEqual([])
		expect(results.some((result) => result.labels.length > 0)).toBe(true)
	}, 30_000)

	it("extracts label evidence from the corpus without editing sch2tikz-out", () => {
		const evidence = listTikzCorpusFiles().flatMap((file) => {
			return extractLabelEvidence(file, readFileSync(file, "utf8"))
		})

		expect(evidence.some((entry) => entry.kind === "path-label")).toBe(true)
		expect(evidence.some((entry) => entry.kind === "node-label")).toBe(true)
		expect(evidence.some((entry) => entry.kind === "font-or-math")).toBe(true)
	}, 30_000)

	it("keeps minimal label fixtures parseable as regression cases", () => {
		setupTikzRoundTripRuntime()

		for (const labelCase of tikzLabelCases) {
			const parsed = parseTikz(labelCase.code)
			expect(parsed.length, labelCase.name).toBeGreaterThan(0)
			const evidence = extractLabelEvidence(`${labelCase.name}.tikz`, labelCase.code)
			expect(evidence.length, labelCase.name).toBeGreaterThan(0)

			if ("expectedLabel" in labelCase) {
				expect(JSON.stringify(parsed), labelCase.name).toContain(labelCase.expectedLabel)
			}
			if ("expectedText" in labelCase) {
				expect(JSON.stringify(parsed), labelCase.name).toContain(labelCase.expectedText)
			}
			if ("expectedOtherSide" in labelCase) {
				expect(JSON.stringify(parsed), labelCase.name).toContain("\"otherSide\":true")
			}
			if ("expectedMath" in labelCase) {
				expect(JSON.stringify(parsed), labelCase.name).toContain("\"isMath\":true")
			}
		}
	})

	it("round-trips filled connection dots back to node[circ]", () => {
		setupTikzRoundTripRuntime()

		const parsed = parseTikz(String.raw`\fill (3.5, 3) circle (2pt);`)
		expect(parsed).toHaveLength(1)
		expect(parsed[0]).toEqual(
			expect.objectContaining({
				type: "node",
				id: "circ",
			})
		)

		const component = CircuitComponent.fromJson(parsed[0])
		expect(component?.toTikzString()).toBe(String.raw`\node[circ] at (3.5, 3){};`)
	})
})
