/**
 * @vitest-environment node
 */
import { EventEmitter } from "node:events"
import { describe, expect, it, vi } from "vitest"
import { handleGithubAuthRequest, handleGithubCallbackRequest } from "../server/githubAuth"

function createResponse() {
	const headers = new Map<string, any>()
	const res = {
		writeHead: vi.fn(),
		end: vi.fn(),
		getHeader: vi.fn((name: string) => headers.get(name)),
		setHeader: vi.fn((name: string, value: any) => headers.set(name, value)),
	}
	return res
}

describe("OAuth Proxy Endpoints", () => {
	describe("handleGithubAuthRequest", () => {
		it("redirects to GitHub authorize page", () => {
			const req = { headers: { host: "app.example", "x-forwarded-proto": "https" } }
			const res = createResponse()
			
			process.env.GITHUB_CLIENT_ID = "test-client-id"
			process.env.AUTH_COOKIE_SECRET = "test-cookie-secret"
			
			handleGithubAuthRequest(req as any, res as any)
			
			const redirect = res.writeHead.mock.calls[0][1].Location
			expect(redirect).toContain("https://github.com/login/oauth/authorize")
			expect(redirect).toContain("client_id=test-client-id")
			expect(redirect).toContain("state=")
			expect(res.setHeader).toHaveBeenCalledWith("Set-Cookie", expect.stringContaining("visiocirkit_oauth_state="))
			expect(res.end).toHaveBeenCalled()
		})
	})

	describe("handleGithubCallbackRequest", () => {
		it("exchanges code for access token and redirects with an HttpOnly session cookie", async () => {
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
				url: "/api/auth/github/callback?code=mock-code&state=mock-state",
				headers: {
					host: "app.example",
					"x-forwarded-proto": "https",
					cookie: "visiocirkit_oauth_state=mock-state",
				},
			}
			const res = createResponse()
			
			process.env.GITHUB_CLIENT_ID = "test-client-id"
			process.env.GITHUB_CLIENT_SECRET = "test-client-secret"
			process.env.AUTH_COOKIE_SECRET = "test-cookie-secret"
			
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
				Location: "/",
			})
			const cookies = res.setHeader.mock.calls.at(-1)?.[1]
			expect(cookies.join("; ")).toContain("visiocirkit_session=")
			expect(cookies.join("; ")).toContain("HttpOnly")
			expect(res.end).toHaveBeenCalled()
		})
	})
})
