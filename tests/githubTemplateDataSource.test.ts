/**
 * @vitest-environment node
 */
import { describe, expect, it, vi, beforeEach } from "vitest"
import { GitHubTemplateDataSource } from "../src/scripts/services/githubTemplateDataSource"

describe("GitHubTemplateDataSource", () => {
	let fetchMock: any
	let dataSource: GitHubTemplateDataSource
	let activeRepo: { owner: string; repo: string } | null = { owner: "testowner", repo: "testrepo" }

	beforeEach(() => {
		fetchMock = vi.fn()
		global.fetch = fetchMock
		activeRepo = { owner: "testowner", repo: "testrepo" }
		dataSource = new GitHubTemplateDataSource(
			"",
			() => activeRepo
		)
	})

	it("throws if no active repository is selected", async () => {
		activeRepo = null
		await expect(dataSource.listFiles()).rejects.toThrow("No active GitHub repository selected")
	})

	it("lists files in repo matching *.tex", async () => {
		const mockTree = {
			tree: [
				{ path: "drawing1.tex", type: "blob" },
				{ path: "README.md", type: "blob" },
				{ path: "folder/drawing2.tex", type: "blob" },
			]
		}
		
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => mockTree,
		})

		const files = await dataSource.listFiles()
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/github/repos/testowner/testrepo/git/trees/main?recursive=1",
			expect.objectContaining({
				credentials: "include",
				headers: expect.objectContaining({
					Accept: "application/vnd.github+json",
				})
			})
		)
		expect(files).toEqual({
			templates: [],
			works: ["drawing1.tex", "folder/drawing2.tex"],
		})
	})

	it("reads file content from repo and caches sha", async () => {
		const mockFile = {
			content: Buffer.from("tikz code").toString("base64"),
			sha: "file-sha-123",
		}
		
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => mockFile,
		})

		const content = await dataSource.readFile("work", "drawing1.tex")
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/github/repos/testowner/testrepo/contents/drawing1.tex",
			expect.any(Object)
		)
		expect(content).toBe("tikz code")
		expect(dataSource.getCachedSha("drawing1.tex")).toBe("file-sha-123")
	})

	it("saves file to repo with cached sha", async () => {
		dataSource.setCachedSha("drawing1.tex", "file-sha-123")
		
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({ content: { sha: "new-sha" } }),
		})

		await dataSource.saveWork("drawing1.tex", "new tikz code")
		
		expect(fetchMock).toHaveBeenCalledWith(
			"/api/github/repos/testowner/testrepo/contents/drawing1.tex",
			expect.objectContaining({
				method: "PUT",
				credentials: "include",
				body: JSON.stringify({
					message: "Update drawing1.tex",
					content: Buffer.from("new tikz code").toString("base64"),
					sha: "file-sha-123",
				}),
			})
		)
	})
})
