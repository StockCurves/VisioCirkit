import { describe, expect, it, vi } from "vitest"
import { OneDriveStorageAdapter } from "../src/scripts/services/oneDriveStorageAdapter"

describe("OneDriveStorageAdapter", () => {
	it("initializes with provider details", () => {
		const adapter = new OneDriveStorageAdapter({ clientId: "test-onedrive-client-id" })
		expect(adapter.providerId).toBe("one-drive")
		expect(adapter.providerName).toBe("Microsoft OneDrive")
		expect(adapter.isAuthenticated()).toBe(false)
		expect(adapter.getUser()).toBeNull()
	})

	it("manages access token and authentication state", () => {
		const adapter = new OneDriveStorageAdapter({ clientId: "test-client-id" })
		adapter.setAccessToken("fake-onedrive-token")
		adapter.setUser({ id: "ms-123", name: "MS User", email: "ms@example.com" })

		expect(adapter.getAccessToken()).toBe("fake-onedrive-token")
		expect(adapter.isAuthenticated()).toBe(true)
		expect(adapter.getUser()?.email).toBe("ms@example.com")
	})

	it("lists files from OneDrive AppFolder", async () => {
		const mockFetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				value: [
					{
						id: "item-1",
						name: "circuit1.tex",
						file: { mimeType: "text/plain" },
						lastModifiedDateTime: "2026-08-22T12:00:00Z",
					},
				],
			}),
		})

		const adapter = new OneDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "1", name: "User", email: "user@test.com" })

		const files = await adapter.listFiles()
		expect(files).toHaveLength(1)
		expect(files[0].name).toBe("circuit1.tex")
		expect(files[0].id).toBe("item-1")
		expect(mockFetch).toHaveBeenCalledWith(
			"https://graph.microsoft.com/v1.0/me/drive/special/approot/children",
			expect.objectContaining({ headers: { Authorization: "Bearer fake-token" } })
		)
	})

	it("saves a file to OneDrive AppFolder via PUT request", async () => {
		const mockFetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				id: "item-2",
				name: "my-circuit.tex",
				file: { mimeType: "text/plain" },
				lastModifiedDateTime: "2026-08-22T12:30:00Z",
			}),
		})

		const adapter = new OneDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "1", name: "User", email: "user@test.com" })

		const saved = await adapter.saveFile("my-circuit.tex", "\\begin{tikzpicture}\\end{tikzpicture}")
		expect(saved.id).toBe("item-2")
		expect(saved.name).toBe("my-circuit.tex")
		expect(mockFetch).toHaveBeenCalledWith(
			"https://graph.microsoft.com/v1.0/me/drive/special/approot:/my-circuit.tex:/content",
			expect.objectContaining({
				method: "PUT",
				body: "\\begin{tikzpicture}\\end{tikzpicture}",
			})
		)
	})
})
