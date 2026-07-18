import { describe, expect, it, vi, beforeEach } from "vitest"
import { AuthService } from "../src/scripts/services/authService"

describe("AuthService", () => {
	let service: AuthService

	beforeEach(() => {
		service = new AuthService("https://app.example")
	})

	it("fetches user profile from the session endpoint", async () => {
		const mockProfile = { login: "testuser", id: 12345 }
		
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ authenticated: true, user: mockProfile }),
		})
		global.fetch = fetchMock

		const profile = await service.getUserProfile()
		
		expect(fetchMock).toHaveBeenCalledWith("https://app.example/api/auth/session", {
			credentials: "include",
			headers: {
				Accept: "application/json",
			},
		})
		expect(profile).toEqual(mockProfile)
	})

	it("returns an unauthenticated session for 401 responses", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			status: 401,
			ok: false,
		})
		global.fetch = fetchMock

		await expect(service.getSession()).resolves.toEqual({ authenticated: false })
	})

	it("builds the GitHub OAuth URL from the runtime API base", () => {
		expect(service.getAuthorizationUrl("http://localhost:3001")).toBe(
			"http://localhost:3001/api/auth/github"
		)
		expect(service.getAuthorizationUrl("http://localhost:3001/")).toBe(
			"http://localhost:3001/api/auth/github"
		)
		expect(service.getAuthorizationUrl("")).toBe("/api/auth/github")
	})
})
