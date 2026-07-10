import { describe, expect, it, vi, beforeEach } from "vitest"
import { AuthService } from "../src/scripts/services/authService"

describe("AuthService", () => {
	let service: AuthService

	beforeEach(() => {
		localStorage.clear()
		service = new AuthService()
	})

	it("manages OAuth tokens in localStorage", () => {
		expect(service.getToken()).toBeNull()
		
		service.saveToken("test-token-123")
		expect(service.getToken()).toBe("test-token-123")
		
		service.clearToken()
		expect(service.getToken()).toBeNull()
	})

	it("fetches user profile from GitHub API using token", async () => {
		const mockProfile = { login: "testuser", id: 12345 }
		
		// Mock global fetch
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => mockProfile,
		})
		global.fetch = fetchMock

		service.saveToken("my-token")
		const profile = await service.getUserProfile()
		
		expect(fetchMock).toHaveBeenCalledWith("https://api.github.com/user", {
			headers: {
				Authorization: "Bearer my-token",
				Accept: "application/vnd.github+json",
			},
		})
		expect(profile).toEqual(mockProfile)
	})
})
