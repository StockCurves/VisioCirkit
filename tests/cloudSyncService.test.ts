import { describe, expect, it, vi } from "vitest"
import { CloudSyncService } from "../src/scripts/services/cloudSyncService"
import { CloudFile, CloudUser, IStorageAdapter } from "../src/scripts/services/storageAdapter"

describe("CloudSyncService", () => {
	const createMockAdapter = (user: CloudUser | null = null): IStorageAdapter => {
		let currentUser = user
		const files: CloudFile[] = []

		return {
			providerId: "mock-provider",
			providerName: "Mock Provider",
			login: vi.fn().mockImplementation(async () => {
				currentUser = { id: "1", name: "Mock User", email: "mock@example.com" }
				return currentUser
			}),
			logout: vi.fn().mockImplementation(async () => {
				currentUser = null
			}),
			getUser: () => currentUser,
			isAuthenticated: () => currentUser !== null,
			listFiles: vi.fn().mockImplementation(async () => files),
			getFile: vi.fn().mockImplementation(async (fileId: string) => `content-of-${fileId}`),
			saveFile: vi.fn().mockImplementation(async (name: string, content: string, fileId?: string) => {
				const id = fileId || `cloud-id-${name}`
				const f: CloudFile = { id, name, content, mimeType: "text/plain", updatedAt: Date.now() }
				files.push(f)
				return f
			}),
			deleteFile: vi.fn().mockImplementation(async () => {}),
		}
	}

	const createMockWorkFileRepo = () => {
		let workFiles: Array<{ name: string; content: string; updatedAt: number }> = []
		return {
			listWorkFiles: vi.fn().mockImplementation(async () => workFiles),
			getWorkFile: vi.fn().mockImplementation(async (name: string) => workFiles.find((w) => w.name === name)),
			putWorkFile: vi.fn().mockImplementation(async (name: string, content: string) => {
				const existing = workFiles.find((w) => w.name === name)
				if (existing) {
					existing.content = content
					existing.updatedAt = Date.now()
				} else {
					workFiles.push({ name, content, updatedAt: Date.now() })
				}
			}),
			deleteWorkFile: vi.fn().mockImplementation(async (name: string) => {
				workFiles = workFiles.filter((w) => w.name !== name)
			}),
			setMockFiles: (files: Array<{ name: string; content: string; updatedAt: number }>) => {
				workFiles = [...files]
			},
		}
	}

	const createMockCustomSymbolRepo = () => {
		let symbols: any[] = []
		return {
			getCustomSymbols: vi.fn().mockImplementation(async () => symbols),
			saveCustomSymbols: vi.fn().mockImplementation(async (newSymbols: any[]) => {
				symbols = newSymbols
			}),
			setMockSymbols: (s: any[]) => {
				symbols = [...s]
			},
		}
	}

	it("manages adapter assignment and login events", async () => {
		const workFileRepo = createMockWorkFileRepo() as any
		const customSymbolRepo = createMockCustomSymbolRepo() as any
		const service = new CloudSyncService(workFileRepo, customSymbolRepo)

		const userListener = vi.fn()
		service.onUserChange(userListener)

		const adapter = createMockAdapter()
		service.setAdapter(adapter)
		expect(userListener).toHaveBeenCalledWith(null)

		await service.login()
		expect(service.isAuthenticated()).toBe(true)
		expect(service.getUser()?.email).toBe("mock@example.com")
		expect(userListener).toHaveBeenCalledWith(expect.objectContaining({ email: "mock@example.com" }))
	})

	it("syncs local work files to cloud if cloud is empty", async () => {
		const workFileRepo = createMockWorkFileRepo()
		workFileRepo.setMockFiles([
			{ name: "circuitA.tex", content: "\\draw (0,0) to[R] (2,0);", updatedAt: 1000 },
		])
		const customSymbolRepo = createMockCustomSymbolRepo() as any
		const service = new CloudSyncService(workFileRepo as any, customSymbolRepo)

		const adapter = createMockAdapter({ id: "1", name: "User", email: "user@test.com" })
		service.setAdapter(adapter)

		const result = await service.syncAll()
		expect(result.workFilesUploaded).toBe(1)
		expect(result.workFilesDownloaded).toBe(0)
		expect(adapter.saveFile).toHaveBeenCalledWith("circuitA.tex", "\\draw (0,0) to[R] (2,0);")
		expect(service.getStatus()).toBe("synced")
	})

	it("downloads missing cloud files to local storage", async () => {
		const workFileRepo = createMockWorkFileRepo()
		const customSymbolRepo = createMockCustomSymbolRepo() as any
		const service = new CloudSyncService(workFileRepo as any, customSymbolRepo)

		const adapter = createMockAdapter({ id: "1", name: "User", email: "user@test.com" })
		adapter.listFiles = vi.fn().mockResolvedValue([
			{ id: "c-1", name: "cloudCircuit.tex", mimeType: "text/plain", updatedAt: 5000 },
		])
		adapter.getFile = vi.fn().mockResolvedValue("\\begin{circuitikz}\\end{circuitikz}")
		service.setAdapter(adapter)

		const result = await service.syncAll()
		expect(result.workFilesDownloaded).toBe(1)
		expect(workFileRepo.putWorkFile).toHaveBeenCalledWith(
			"cloudCircuit.tex",
			"\\begin{circuitikz}\\end{circuitikz}"
		)
	})
})
