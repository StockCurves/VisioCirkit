/**
 * @vitest-environment node
 */
import { EventEmitter } from "node:events"
import { describe, expect, it, vi } from "vitest"
import { handleGithubAuthRequest, handleGithubCallbackRequest } from "../server/oauthProxy"

function createResponse() {
	const res = {
		writeHead: vi.fn(),
		end: vi.fn(),
	}
	return res
}

describe("OAuth Proxy Endpoints", () => {
	describe("handleGithubAuthRequest", () => {
		it("redirects to GitHub authorize page", () => {
			const req = {}
			const res = createResponse()
			
			// Mock client ID
			process.env.GITHUB_CLIENT_ID = "test-client-id"
			
			handleGithubAuthRequest(req as any, res as any)
			
			expect(res.writeHead).toHaveBeenCalledWith(302, {
				Location: expect.stringContaining("https://github.com/login/oauth/authorize?client_id=test-client-id"),
			})
			expect(res.end).toHaveBeenCalled()
		})
	})

	describe("handleGithubCallbackRequest", () => {
		it("exchanges code for access token and redirects to frontend", async () => {
			const proxyRes = new EventEmitter() as EventEmitter & { statusCode?: number }
			proxyRes.statusCode = 200
			const proxyReq = new EventEmitter() as EventEmitter & { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }
			proxyReq.write = vi.fn()
			proxyReq.end = vi.fn(() => {
				proxyRes.emit("data", '{"access_token":"mock-access-token","token_type":"bearer"}')
				proxyRes.emit("end")
			})

			const request = vi.fn((_options, callback) => {
				callback(proxyRes)
				return proxyReq
			})

			const req = {
				url: "/api/auth/github/callback?code=mock-code"
			}
			const res = createResponse()
			
			process.env.GITHUB_CLIENT_ID = "test-client-id"
			process.env.GITHUB_CLIENT_SECRET = "test-client-secret"
			
			await handleGithubCallbackRequest(req as any, res as any, { request } as any)

			expect(request).toHaveBeenCalledWith(
				expect.objectContaining({
					hostname: "github.com",
					path: "/login/oauth/access_token",
					method: "POST",
					headers: expect.objectContaining({
						"Accept": "application/json",
					})
				}),
				expect.any(Function)
			)
			expect(res.writeHead).toHaveBeenCalledWith(302, {
				Location: "/?token=mock-access-token",
			})
			expect(res.end).toHaveBeenCalled()
		})
	})
})
