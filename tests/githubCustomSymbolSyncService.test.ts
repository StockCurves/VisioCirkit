/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { GitHubCustomSymbolSyncService } from "../src/scripts/services/githubCustomSymbolSyncService"

describe("GitHubCustomSymbolSyncService", () => {
	let fetchMock: any
	let mockRepository: any
	let syncService: GitHubCustomSymbolSyncService

	beforeEach(() => {
		fetchMock = vi.fn()
		global.fetch = fetchMock
		
		mockRepository = {
			getCustomSymbols: vi.fn().mockResolvedValue([]),
			getCustomCategories: vi.fn().mockResolvedValue([]),
			putCustomSymbol: vi.fn().mockResolvedValue(undefined),
			putCustomCategory: vi.fn().mockResolvedValue(undefined),
			deleteCustomSymbol: vi.fn().mockResolvedValue(undefined),
			deleteCustomCategory: vi.fn().mockResolvedValue(undefined),
		}

		syncService = new GitHubCustomSymbolSyncService(
			"",
			mockRepository as any
		)
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it("checks for repo existence and creates it if missing", async () => {
		// Mock GET /user (resolveOwner)
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ login: "testowner" }),
		})
		// Mock GET repo (check exist) -> 404 (missing)
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: 404,
		})
		// Mock POST /user/repos (create) -> 201
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 201,
			json: async () => ({ name: "visiocirkit-library" }),
		})

		await syncService.ensureLibraryRepo()

		expect(fetchMock).toHaveBeenCalledWith(
			"/api/github/user",
			expect.any(Object)
		)
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/github/repos/testowner/visiocirkit-library",
			expect.any(Object)
		)
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/github/user/repos",
			expect.objectContaining({
				method: "POST",
				credentials: "include",
				body: JSON.stringify({
					name: "visiocirkit-library",
					private: true,
					description: "VisioCirkit global component library",
				}),
			})
		)
	})

	it("pulls and merges categories and symbols from remote", async () => {
		// Mock GET /user
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ login: "testowner" }),
		})
		// Mock GET repo (check exist) -> 200 (exists)
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ name: "visiocirkit-library" }),
		})
		// Mock GET categories.json -> content
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({
				content: Buffer.from(JSON.stringify([{ name: "My Cat", symbolIds: ["sym-1"] }])).toString("base64"),
				sha: "categories-sha",
			}),
		})
		// Mock GET tree -> symbols/sym-1.json
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({
				tree: [
					{ path: "symbols/sym-1.json", sha: "sym-1-sha", type: "blob" }
				]
			}),
		})
		// Mock GET symbols/sym-1.json -> content
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({
				content: Buffer.from(JSON.stringify({ id: "sym-1", displayName: "Sym 1", updatedAt: 2000 })).toString("base64"),
			}),
		})

		// Local has sym-1 but older
		mockRepository.getCustomSymbols.mockResolvedValue([
			{ id: "sym-1", displayName: "Sym 1 Local", updatedAt: 1000 }
		])
		mockRepository.getCustomCategories.mockResolvedValue([])

		await syncService.sync()

		expect(mockRepository.putCustomSymbol).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "sym-1",
				displayName: "Sym 1",
				updatedAt: 2000,
			})
		)
		expect(mockRepository.putCustomCategory).toHaveBeenCalledWith({
			name: "My Cat",
			symbolIds: ["sym-1"],
		})
	})

	it("pushes local changes to remote with debouncing", async () => {
		vi.useFakeTimers()
		
		// Mock GET /user
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ login: "testowner" }),
		})
		// Mock GET repo (check exist) -> 200
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ name: "visiocirkit-library" }),
		})
		
		// Mock PUT categories.json
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ content: { sha: "cat-new-sha" } }),
		})
		// Mock PUT symbol
		fetchMock.mockResolvedValueOnce({
			ok: true,
			status: 200,
			json: async () => ({ content: { sha: "sym-new-sha" } }),
		})

		// Local has newer symbol
		mockRepository.getCustomSymbols.mockResolvedValue([
			{ id: "sym-1", displayName: "Sym 1", updatedAt: 5000 }
		])
		mockRepository.getCustomCategories.mockResolvedValue([
			{ name: "My Cat", symbolIds: ["sym-1"] }
		])

		// Trigger sync push
		syncService.triggerPush()

		// Fast forward timer by 1s (should not call fetch yet because debounce is 3s)
		vi.advanceTimersByTime(1000)
		expect(fetchMock).not.toHaveBeenCalled()

		// Fast-forward by another 2s (total 3s)
		await vi.runOnlyPendingTimersAsync()
		
		expect(fetchMock).toHaveBeenCalled()
	})
})
