import { afterEach, describe, expect, it, vi } from "vitest"
import { getApiBase } from "../src/scripts/services/apiBase"
import { LocalTemplateFileService } from "../src/scripts/services/localTemplateFileService"
import { createTemplateDataSource, getRuntimeMode } from "../src/scripts/services/runtimeMode"
import { TemplateFileService } from "../src/scripts/services/templateFileService"
import { LatexRenderService, prepareLatexSource } from "../src/scripts/services/latexRenderService"

const mockFetch = (response: Partial<Response>) => {
	const fetchMock = vi.fn().mockResolvedValue(response)
	vi.stubGlobal("fetch", fetchMock)
	return fetchMock
}

describe("getApiBase", () => {
	it("uses the local dev server for localhost", () => {
		expect(getApiBase("localhost")).toBe("http://localhost:3001")
		expect(getApiBase("127.0.0.1")).toBe("http://localhost:3001")
	})

	it("uses same-origin API paths for deployed hosts", () => {
		expect(getApiBase("example.com")).toBe("")
	})
})

describe("runtime mode", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("uses server mode on localhost and local mode on deployed hosts", () => {
		expect(getRuntimeMode("localhost")).toBe("server")
		expect(getRuntimeMode("127.0.0.1")).toBe("server")
		expect(getRuntimeMode("example.com")).toBe("local")
	})

	it("creates a local template data source for local mode", () => {
		expect(createTemplateDataSource("local")).toBeInstanceOf(LocalTemplateFileService)
		expect(createTemplateDataSource("server")).toBeInstanceOf(TemplateFileService)
	})
})

const makeLocalTemplateDb = () => {
	const records = new Map<string, any>()
	const request = <T>(result: T) => ({ result, onsuccess: null, onerror: null } as unknown as IDBRequest<T>)
	const completeTransaction = (transaction: any) => {
		setTimeout(() => transaction.oncomplete?.(), 0)
	}

	return {
		transaction(_storeNames: string | string[], _mode?: IDBTransactionMode) {
			const transaction: any = {
				oncomplete: null,
				onerror: null,
				onabort: null,
				objectStore() {
					return {
						getAll() {
							const req = request(Array.from(records.values()))
							setTimeout(() => req.onsuccess?.({ target: req } as any), 0)
							return req
						},
						get(name: string) {
							const req = request(records.get(name))
							setTimeout(() => req.onsuccess?.({ target: req } as any), 0)
							return req
						},
						put(record: any) {
							records.set(record.name, record)
							completeTransaction(transaction)
							return request(undefined)
						},
						delete(name: string) {
							records.delete(name)
							completeTransaction(transaction)
							return request(undefined)
						},
					}
				},
			}
			return transaction
		},
	}
}

describe("LocalTemplateFileService", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("lists static templates and IndexedDB work files", async () => {
		const db = makeLocalTemplateDb() as unknown as IDBDatabase
		const service = new LocalTemplateFileService(() => Promise.resolve(db))

		await service.saveWork("draft.tex", "\\draw (0,0) -- (1,0);")

		const result = await service.listFiles()
		expect(result.templates).toContain("rc-lowpass.tex")
		expect(result.works).toEqual(["draft.tex"])
	})

	it("reads templates from static URLs and work files from IndexedDB", async () => {
		const db = makeLocalTemplateDb() as unknown as IDBDatabase
		const service = new LocalTemplateFileService(() => Promise.resolve(db))
		const fetchMock = mockFetch({
			ok: true,
			text: vi.fn().mockResolvedValue("\\begin{circuitikz}\\end{circuitikz}"),
		})

		expect(await service.readFile("template", "rc-lowpass.tex")).toBe("\\begin{circuitikz}\\end{circuitikz}")
		expect(fetchMock).toHaveBeenCalledTimes(1)

		await service.saveWork("draft.tex", "\\draw (0,0) -- (2,0);")
		expect(await service.readFile("work", "draft.tex")).toBe("\\draw (0,0) -- (2,0);")
	})

	it("deletes IndexedDB work files", async () => {
		const db = makeLocalTemplateDb() as unknown as IDBDatabase
		const service = new LocalTemplateFileService(() => Promise.resolve(db))

		await service.saveWork("draft.tex", "\\draw (0,0) -- (1,0);")
		await service.deleteWork("draft.tex")

		await expect(service.readFile("work", "draft.tex")).rejects.toThrow("Work file not found.")
	})
})

describe("TemplateFileService", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("fetches the server file list from the existing endpoint", async () => {
		const fetchMock = mockFetch({
			json: vi.fn().mockResolvedValue({ templates: ["rc-lowpass.tex"], works: ["draft.tex"] }),
		})

		const result = await new TemplateFileService("http://localhost:3001").fetchFiles()

		expect(fetchMock).toHaveBeenCalledWith("http://localhost:3001/api/files")
		expect(result).toEqual({ templates: ["rc-lowpass.tex"], works: ["draft.tex"] })
	})

	it("loads files with the same query shape as the previous controller code", async () => {
		const fetchMock = mockFetch({
			ok: true,
			text: vi.fn().mockResolvedValue("\\begin{circuitikz}\\end{circuitikz}"),
		})

		const result = await new TemplateFileService("").loadFile("work", "my circuit.tex")

		expect(fetchMock).toHaveBeenCalledWith("/api/file?dir=work&name=my%20circuit.tex")
		expect(result).toBe("\\begin{circuitikz}\\end{circuitikz}")
	})

	it("saves work files to the existing save endpoint", async () => {
		const fetchMock = mockFetch({
			ok: true,
			json: vi.fn().mockResolvedValue({ success: true }),
		})

		await new TemplateFileService("").saveWorkFile("draft.tex", "\\draw (0,0) -- (1,0);")

		expect(fetchMock).toHaveBeenCalledWith("/api/save", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ dir: "work", name: "draft.tex", content: "\\draw (0,0) -- (1,0);" }),
		})
	})

	it("deletes work files through the existing delete endpoint", async () => {
		const fetchMock = mockFetch({
			ok: true,
			json: vi.fn().mockResolvedValue({ success: true }),
		})

		await new TemplateFileService("").deleteWorkFile("draft.tex")

		expect(fetchMock).toHaveBeenCalledWith("/api/delete", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ dir: "work", name: "draft.tex" }),
		})
	})
})

describe("LatexRenderService", () => {
	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it("prepares LaTeX using the same cleanup and library extraction rules", () => {
		const prepared = prepareLatexSource(`\\documentclass{article}
\\usepackage{circuitikz}
\\begin{document}
% comment
\\usetikzlibrary{positioning, arrows.meta}
\\draw (0,0) node[font=\\small] {電};
\\end{document}`)

		expect(prepared.libraries).toEqual(["calc", "positioning", "arrows.meta"])
		expect(prepared.bodyCode).not.toContain("\\documentclass")
		expect(prepared.bodyCode).not.toContain("\\usepackage")
		expect(prepared.bodyCode).not.toContain("\\usetikzlibrary")
		expect(prepared.bodyCode).not.toContain("電")
		expect(prepared.bodyCode).toContain("\\draw (0,0) node[] {};")
	})

	it("posts QuickLaTeX form data and converts png URLs to svg URLs", async () => {
		const fetchMock = mockFetch({
			text: vi.fn().mockResolvedValue("0\nhttps://quicklatex.com/cache/example.png 100 50\n"),
		})

		const img = await new LatexRenderService("").renderViaQuickLaTeX("\\draw (0,0) -- (1,0);", ["calc"])

		expect(fetchMock).toHaveBeenCalledWith("/api/latex", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: expect.stringContaining("formula=%5Cdraw%20(0%2C0)%20--%20(1%2C0)%3B"),
		})
		expect(img.src).toBe("https://quicklatex.com/cache/example.svg")
		expect(img.alt).toBe("CircuiTikZ Render")
	})

	it("preserves QuickLaTeX compilation errors", async () => {
		mockFetch({
			text: vi.fn().mockResolvedValue("1\nUnknown control sequence\n"),
		})

		await expect(new LatexRenderService("").renderViaQuickLaTeX("\\bad", ["calc"])).rejects.toThrow(
			"QuickLaTeX: Unknown control sequence"
		)
	})
})
