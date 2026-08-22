import { beforeEach, describe, expect, it, vi } from "vitest"
import { OneDriveStorageAdapter } from "../src/scripts/services/oneDriveStorageAdapter"

const msalMock = vi.hoisted(() => ({
	initialize: vi.fn(),
	loginPopup: vi.fn(),
	PublicClientApplication: vi.fn(),
}))

vi.mock("@azure/msal-browser", () => ({
	PublicClientApplication: msalMock.PublicClientApplication,
}))

describe("OneDriveStorageAdapter", () => {
	beforeEach(() => {
		localStorage.clear()
		msalMock.initialize.mockReset().mockResolvedValue(undefined)
		msalMock.loginPopup.mockReset().mockResolvedValue({ accessToken: "msal-token" })
		msalMock.PublicClientApplication.mockReset().mockImplementation(function () {
			return { initialize: msalMock.initialize, loginPopup: msalMock.loginPopup }
		})
		delete (window as any).msal
	})

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

	it("does not fall back to deprecated implicit token flow", async () => {
		const popup = { closed: false, close: vi.fn(), location: { hash: "" } } as unknown as Window
		const openSpy = vi.spyOn(window, "open").mockReturnValue(popup)
		const mockFetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "ms-123", displayName: "MS User", mail: "ms@example.com" }),
		})

		try {
			const adapter = new OneDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
			await adapter.login()

			expect(openSpy).not.toHaveBeenCalled()
		} finally {
			openSpy.mockRestore()
		}
	})

	it("uses bundled MSAL before logging in to OneDrive", async () => {
		const appendSpy = vi.spyOn(document.head, "appendChild")
		const mockFetch = vi.fn().mockResolvedValueOnce({
			ok: true,
			json: async () => ({ id: "ms-123", displayName: "MS User", mail: "ms@example.com" }),
		})

		try {
			const adapter = new OneDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
			const user = await adapter.login()

			expect(user.email).toBe("ms@example.com")
			expect(appendSpy).not.toHaveBeenCalled()
			expect(msalMock.PublicClientApplication).toHaveBeenCalledWith(
				expect.objectContaining({
					auth: expect.objectContaining({ clientId: "test-id" }),
				})
			)
			expect(msalMock.loginPopup).toHaveBeenCalledWith({ scopes: ["Files.ReadWrite", "User.Read"] })
		} finally {
			appendSpy.mockRestore()
		}
	})

	it("lists files from the VisioCirkit OneDrive folder", async () => {
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
			"https://graph.microsoft.com/v1.0/me/drive/root:/VisioCirkit:/children",
			expect.objectContaining({ headers: { Authorization: "Bearer fake-token" } })
		)
	})

	it("treats missing VisioCirkit OneDrive folder listings as an empty folder", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({ error: { message: "Item not found" } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "folder-1", name: "VisioCirkit" }),
			})

		const adapter = new OneDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "1", name: "User", email: "user@test.com" })

		await expect(adapter.listFiles()).resolves.toEqual([])
		expect(mockFetch).toHaveBeenNthCalledWith(
			2,
			"https://graph.microsoft.com/v1.0/me/drive/root/children",
			expect.objectContaining({ method: "POST" })
		)
	})

	it("treats OneDrive resource-not-found folder listings as an empty folder", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({ error: { message: "The resource could not be found." } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "folder-1", name: "VisioCirkit" }),
			})

		const adapter = new OneDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "1", name: "User", email: "user@test.com" })

		await expect(adapter.listFiles()).resolves.toEqual([])
		expect(mockFetch).toHaveBeenNthCalledWith(
			2,
			"https://graph.microsoft.com/v1.0/me/drive/root/children",
			expect.objectContaining({ method: "POST" })
		)
	})

	it("saves a file to the VisioCirkit OneDrive folder via PUT request", async () => {
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
			"https://graph.microsoft.com/v1.0/me/drive/root:/VisioCirkit/my-circuit.tex:/content",
			expect.objectContaining({
				method: "PUT",
				body: "\\begin{tikzpicture}\\end{tikzpicture}",
			})
		)
	})

	it("creates the VisioCirkit OneDrive folder before retrying a missing-parent upload", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({ error: { message: "Item not found" } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "folder-1", name: "VisioCirkit" }),
			})
			.mockResolvedValueOnce({
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
		expect(mockFetch).toHaveBeenNthCalledWith(
			2,
			"https://graph.microsoft.com/v1.0/me/drive/root/children",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({
					name: "VisioCirkit",
					folder: {},
					"@microsoft.graph.conflictBehavior": "replace",
				}),
			})
		)
		expect(mockFetch).toHaveBeenNthCalledWith(
			3,
			"https://graph.microsoft.com/v1.0/me/drive/root:/VisioCirkit/my-circuit.tex:/content",
			expect.objectContaining({ method: "PUT" })
		)
	})

	it("creates the VisioCirkit OneDrive folder before retrying a resource-not-found upload", async () => {
		const mockFetch = vi
			.fn()
			.mockResolvedValueOnce({
				ok: false,
				status: 404,
				statusText: "Not Found",
				json: async () => ({ error: { message: "The resource could not be found." } }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({ id: "folder-1", name: "VisioCirkit" }),
			})
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "item-2",
					name: "blank.tex",
					file: { mimeType: "text/plain" },
					lastModifiedDateTime: "2026-08-22T12:30:00Z",
				}),
			})

		const adapter = new OneDriveStorageAdapter({ clientId: "test-id" }, mockFetch)
		adapter.setAccessToken("fake-token")
		adapter.setUser({ id: "1", name: "User", email: "user@test.com" })

		const saved = await adapter.saveFile("blank.tex", "")

		expect(saved.id).toBe("item-2")
		expect(mockFetch).toHaveBeenNthCalledWith(
			2,
			"https://graph.microsoft.com/v1.0/me/drive/root/children",
			expect.objectContaining({ method: "POST" })
		)
		expect(mockFetch).toHaveBeenNthCalledWith(
			3,
			"https://graph.microsoft.com/v1.0/me/drive/root:/VisioCirkit/blank.tex:/content",
			expect.objectContaining({ method: "PUT" })
		)
	})
})
