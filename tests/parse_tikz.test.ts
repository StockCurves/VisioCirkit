// @vitest-environment jsdom
import { expect, test } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as SVG from '@svgdotjs/svg.js'
import { setupTikzRoundTripRuntime } from './helpers/tikzCorpusRoundTrip'

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
