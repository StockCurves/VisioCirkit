import { describe, expect, it, vi } from "vitest"
import { GoogleDriveStorageAdapter } from "../src/scripts/services/googleDriveStorageAdapter"

describe("GoogleDriveStorageAdapter", () => {
	it("initializes with provider details", () => {
		const adapter = new GoogleDriveStorageAdapter({ clientId: "test-client-id" })
		expect(adapter.providerId).toBe("google-drive")
		expect(adapter.providerName).toBe("Google Drive")
		expect(adapter.isAuthenticated()).toBe(false)
		expect(adapter.getUser()).toBeNull()
	})

	it("handles token setting and authentication check", () => {
		const adapter = new GoogleDriveStorageAdapter({ clientId: "test-client-id" })
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "123", name: "Test User", email: "test@example.com" })

		expect(adapter.getAccessToken()).toBe("fake-token")
		expect(adapter.isAuthenticated()).toBe(true)
		expect(adapter.getUser()?.email).toBe("test@example.com")
	})

	it("queries and creates app folder on demand", async () => {
		const mockFetch = vi.fn()
		// 1. Query for folder (returns empty list)
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ files: [] }),
		})
		// 2. Create folder
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "folder-123", name: "VisioCirkit" }),
		})

		const adapter = new GoogleDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "1", name: "User", email: "user@test.com" })

		const folderId = await adapter.getOrCreateAppFolder()
		expect(folderId).toBe("folder-123")
		expect(mockFetch).toHaveBeenCalledTimes(2)
	})

	it("lists files inside the app folder", async () => {
		const mockFetch = vi.fn()
		// 1. Folder query returns folder-123
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ files: [{ id: "folder-123", name: "VisioCirkit" }] }),
		})
		// 2. List files returns file list
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				files: [
					{ id: "file-1", name: "circuit1.tex", mimeType: "text/plain", modifiedTime: "2026-08-22T08:00:00Z" },
				],
			}),
		})

		const adapter = new GoogleDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "1", name: "User", email: "user@test.com" })

		const files = await adapter.listFiles()
		expect(files).toHaveLength(1)
		expect(files[0].name).toBe("circuit1.tex")
		expect(files[0].id).toBe("file-1")
	})

	it("saves a new file via multipart upload", async () => {
		const mockFetch = vi.fn()
		// 1. Folder query returns cached folder-123
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ files: [{ id: "folder-123", name: "VisioCirkit" }] }),
		})
		// 2. Post file returns created file
		mockFetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "new-file-id", name: "new_circuit.tex", mimeType: "text/plain" }),
		})

		const adapter = new GoogleDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "1", name: "User", email: "user@test.com" })

		const saved = await adapter.saveFile("new_circuit.tex", "\\begin{document}\\end{document}")
		expect(saved.id).toBe("new-file-id")
		expect(saved.name).toBe("new_circuit.tex")
	})
})
