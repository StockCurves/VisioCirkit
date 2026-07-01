// @vitest-environment jsdom
import { expect, test } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as SVG from '@svgdotjs/svg.js'
import { setupTikzRoundTripRuntime } from './helpers/tikzCorpusRoundTrip'
import { CircuitComponent } from "../src/scripts/components/circuitComponent"

globalThis.SVG = SVG
window.SVG = SVG

test('parse 2026-0623-2332.tikz', async () => {
    setupTikzRoundTripRuntime()
    const { parseTikz } = await import('../src/scripts/utils/tikzParser')
    const tikzStr = fs.readFileSync(path.resolve(__dirname, '../sch2tikz-out/2026-0623-2332.tikz'), 'utf-8')
    try {
        const result = parseTikz(tikzStr)
        console.log("Parsed commands count:", result.length)
        expect(result).toBeDefined()
    } catch(e) {
        console.error("Parse failed!")
        console.error(e.message)
        throw e
    }
}, 30_000)

test("flowchart decision nodes stay as shaped visual components", async () => {
    setupTikzRoundTripRuntime()
    const { parseTikz } = await import("../src/scripts/utils/tikzParser")
    const parsed = parseTikz(String.raw`\node[shape=diamond, minimum width=3cm, minimum height=2cm] at (1, 2) {Approved?};`)

    expect(parsed).toHaveLength(1)
    expect(parsed[0]).toEqual(
        expect.objectContaining({
            type: "flowDecision",
            text: expect.objectContaining({
                showPlaceholderText: false,
            }),
        })
    )

    const component = CircuitComponent.fromJson(parsed[0])
    const serialized = component.toTikzString()

    expect(serialized).toContain("shape=diamond")
    expect(serialized).toContain("Approved?")
    expect(serialized.startsWith(String.raw`\node[shape=diamond`)).toBe(true)
}, 30_000)
