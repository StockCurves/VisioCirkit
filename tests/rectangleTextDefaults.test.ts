import { describe, expect, it } from "vitest"

import { defaultFontSize, fontSizes } from "../src/scripts/components/rectangleComponent"

describe("rectangle text defaults", () => {
	it("uses LaTeX small as the omitted default font size", () => {
		expect(defaultFontSize.key).toBe("small")
		expect(defaultFontSize.name).toBe("small")
		expect(fontSizes.find((fontSize) => fontSize.key === "normalsize")?.size).toBe(10)
	})
})
