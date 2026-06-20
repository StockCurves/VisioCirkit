import { EventEmitter } from "node:events"
import { describe, expect, it, vi } from "vitest"

import { handleLatexProxyRequest } from "../server/latexProxy"

function createResponse() {
	const res = {
		writeHead: vi.fn(),
		end: vi.fn(),
	}
	return res
}

describe("handleLatexProxyRequest", () => {
	it("responds to OPTIONS with CORS headers", () => {
		const req = new EventEmitter() as EventEmitter & { method?: string }
		req.method = "OPTIONS"
		const res = createResponse()

		handleLatexProxyRequest(req as any, res as any, { request: vi.fn() } as any)

		expect(res.writeHead).toHaveBeenCalledWith(204, {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		})
		expect(res.end).toHaveBeenCalled()
	})

	it("forwards POST bodies to QuickLaTeX and returns the upstream payload", async () => {
		const proxyRes = new EventEmitter() as EventEmitter & { statusCode?: number }
		proxyRes.statusCode = 200
		const proxyReq = new EventEmitter() as EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
		proxyReq.write = vi.fn()
		proxyReq.end = vi.fn(() => {
			proxyRes.emit("data", "0\nhttps://quicklatex.com/cache/example.png 100 50\n")
			proxyRes.emit("end")
		})

		const request = vi.fn((_options, callback) => {
			callback(proxyRes)
			return proxyReq
		})

		const req = new EventEmitter() as EventEmitter & { method?: string }
		req.method = "POST"
		const res = createResponse()

		handleLatexProxyRequest(req as any, res as any, { request } as any)
		req.emit("data", "formula=test")
		req.emit("end")

		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				hostname: "quicklatex.com",
				path: "/latex3.f",
				method: "POST",
			}),
			expect.any(Function)
		)
		expect(proxyReq.write).toHaveBeenCalledWith("formula=test")
		expect(proxyReq.end).toHaveBeenCalled()
		expect(res.writeHead).toHaveBeenCalledWith(200, {
			"Content-Type": "text/plain; charset=utf-8",
			"Access-Control-Allow-Origin": "*",
		})
		expect(res.end).toHaveBeenCalledWith("0\nhttps://quicklatex.com/cache/example.png 100 50\n")
	})
})
