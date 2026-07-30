import { afterEach, describe, expect, it, vi } from "vitest"
import { writeSvgTextToClipboard } from "../src/scripts/services/clipboardSvgService"

describe("clipboardSvgService", () => {
	const originalClipboardItem = globalThis.ClipboardItem
	const originalCreateImageBitmap = globalThis.createImageBitmap

	afterEach(() => {
		vi.restoreAllMocks()
		Object.defineProperty(navigator, "clipboard", {
			value: undefined,
			configurable: true,
		})
		Object.defineProperty(globalThis, "ClipboardItem", {
			value: originalClipboardItem,
			configurable: true,
		})
		Object.defineProperty(globalThis, "createImageBitmap", {
			value: originalCreateImageBitmap,
			configurable: true,
		})
	})

	it("writes a PNG image instead of plain SVG text for office paste targets", async () => {
		const write = vi.fn().mockResolvedValue(undefined)
		const clipboardItems: Array<Record<string, Blob>> = []
		class FakeClipboardItem {
			constructor(items: Record<string, Blob>) {
				clipboardItems.push(items)
			}
		}

		Object.defineProperty(navigator, "clipboard", {
			value: { write },
			configurable: true,
		})
		Object.defineProperty(globalThis, "ClipboardItem", {
			value: FakeClipboardItem,
			configurable: true,
		})
		Object.defineProperty(globalThis, "createImageBitmap", {
			value: vi.fn().mockResolvedValue({ width: 10, height: 10, close: vi.fn() }),
			configurable: true,
		})
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
			drawImage: vi.fn(),
		} as unknown as CanvasRenderingContext2D)
		vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
			callback(new Blob(["png"], { type: type ?? "image/png" }))
		})

		await writeSvgTextToClipboard('<svg viewBox="0 0 10 10"></svg>')

		expect(write).toHaveBeenCalledTimes(1)
		expect(clipboardItems[0]).toHaveProperty("image/png")
		expect(clipboardItems[0]).toHaveProperty("text/html")
		expect(clipboardItems[0]).not.toHaveProperty("text/plain")
	})

	it("starts the clipboard write before waiting for PNG rasterization", async () => {
		let resolveImageBitmap: (bitmap: { width: number; height: number; close: () => void }) => void = () => {}
		const imageBitmapPromise = new Promise<{ width: number; height: number; close: () => void }>((resolve) => {
			resolveImageBitmap = resolve
		})
		const write = vi.fn().mockResolvedValue(undefined)
		const clipboardItems: Array<Record<string, Blob | Promise<Blob>>> = []
		class FakeClipboardItem {
			constructor(items: Record<string, Blob | Promise<Blob>>) {
				clipboardItems.push(items)
			}
		}

		Object.defineProperty(navigator, "clipboard", {
			value: { write },
			configurable: true,
		})
		Object.defineProperty(globalThis, "ClipboardItem", {
			value: FakeClipboardItem,
			configurable: true,
		})
		Object.defineProperty(globalThis, "createImageBitmap", {
			value: vi.fn().mockReturnValue(imageBitmapPromise),
			configurable: true,
		})
		vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
			drawImage: vi.fn(),
		} as unknown as CanvasRenderingContext2D)
		vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) => {
			callback(new Blob(["png"], { type: type ?? "image/png" }))
		})

		const writePromise = writeSvgTextToClipboard('<svg viewBox="0 0 10 10"></svg>')
		await Promise.resolve()

		expect(write).toHaveBeenCalledTimes(1)
		expect(clipboardItems[0]["image/png"]).toBeInstanceOf(Promise)

		resolveImageBitmap({ width: 10, height: 10, close: vi.fn() })
		await writePromise
	})
})
