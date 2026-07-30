import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("shape library modal layout", () => {
	it("keeps the Apply footer fixed while the shape list scrolls", () => {
		const html = readFileSync("src/pages/index.html", "utf8")
		const styles = readFileSync("src/styles/symbolDB.scss", "utf8")

		expect(html).toContain('class="modal-footer justify-content-between shape-library-modal-footer"')
		expect(styles).toContain(".shape-library-modal-footer")
		expect(styles).toContain("position: sticky")
		expect(styles).toContain("bottom: 0")
	})
})
