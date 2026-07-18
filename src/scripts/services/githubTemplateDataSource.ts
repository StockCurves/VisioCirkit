import type { TemplateDataSource, TemplateDirectory } from "./templateTypes"

export class GitHubTemplateDataSource implements TemplateDataSource {
	private shaCache = new Map<string, string>()

	public constructor(
		private readonly apiBase: string,
		private readonly getActiveRepo: () => { owner: string; repo: string } | null,
		private readonly templateSource?: Pick<TemplateDataSource, "listFiles" | "readFile">
	) {}

	private getHeaders(): Record<string, string> {
		return {
			Accept: "application/vnd.github+json",
			"Content-Type": "application/json",
		}
	}

	private githubApi(path: string): string {
		return `${this.apiBase}/api/github${path.startsWith("/") ? path : "/" + path}`
	}

	private getRepoPath(): string {
		const repo = this.getActiveRepo()
		if (!repo || !repo.owner || !repo.repo) {
			throw new Error("No active GitHub repository selected")
		}
		return `${repo.owner}/${repo.repo}`
	}

	public getCachedSha(name: string): string | undefined {
		return this.shaCache.get(name)
	}

	public setCachedSha(name: string, sha: string): void {
		this.shaCache.set(name, sha)
	}

	private async fetchLatestSha(name: string): Promise<string | undefined> {
		const repoPath = this.getRepoPath()
		try {
			const response = await fetch(this.githubApi(`/repos/${repoPath}/contents/${encodeURI(name)}`), {
				credentials: "include",
				headers: this.getHeaders(),
			})
			if (response.ok) {
				const data = await response.json()
				if (data && data.sha) {
					this.shaCache.set(name, data.sha)
					return data.sha
				}
			}
		} catch (e) {
			console.warn("Failed to fetch SHA for:", name, e)
		}
		return undefined
	}

	public async listFiles(): Promise<{ templates: string[]; works: string[] }> {
		const repoPath = this.getRepoPath()
		const templatesList = this.templateSource ? (await this.templateSource.listFiles()).templates : []

		const response = await fetch(this.githubApi(`/repos/${repoPath}/git/trees/main?recursive=1`), {
			credentials: "include",
			headers: this.getHeaders(),
		})

		if (!response.ok) {
			throw new Error(`Failed to list GitHub files: ${response.statusText}`)
		}

		const data = await response.json()
		const works: string[] = []

		if (data && Array.isArray(data.tree)) {
			for (const node of data.tree) {
				if (node.type === "blob" && node.path.endsWith(".tex")) {
					works.push(node.path)
					if (node.sha) {
						this.shaCache.set(node.path, node.sha)
					}
				}
			}
		}

		return {
			templates: templatesList,
			works: works.sort((a, b) => a.localeCompare(b)),
		}
	}

	public async readFile(dir: TemplateDirectory, name: string): Promise<string> {
		if (dir === "template") {
			if (!this.templateSource) {
				throw new Error("No template source provider available")
			}
			return this.templateSource.readFile(dir, name)
		}

		const repoPath = this.getRepoPath()
		const response = await fetch(this.githubApi(`/repos/${repoPath}/contents/${encodeURI(name)}`), {
			credentials: "include",
			headers: this.getHeaders(),
		})

		if (!response.ok) {
			throw new Error(`Failed to read file from GitHub: ${response.statusText}`)
		}

		const data = await response.json()
		if (data.sha) {
			this.shaCache.set(name, data.sha)
		}

		const base64Content = data.content.replace(/\s/g, "")
		const binString = atob(base64Content)
		return new TextDecoder().decode(Uint8Array.from(binString, (m) => m.charCodeAt(0)))
	}

	public async saveWork(name: string, content: string): Promise<void> {
		const repoPath = this.getRepoPath()
		let sha = this.shaCache.get(name)

		if (!sha) {
			sha = await this.fetchLatestSha(name)
		}

		const binString = new TextEncoder().encode(content)
		const base64Content = btoa(String.fromCharCode(...binString))

		const commitMessage = `Update ${name}`
		const response = await fetch(this.githubApi(`/repos/${repoPath}/contents/${encodeURI(name)}`), {
			method: "PUT",
			credentials: "include",
			headers: this.getHeaders(),
			body: JSON.stringify({
				message: commitMessage,
				content: base64Content,
				sha: sha,
			}),
		})

		if (!response.ok) {
			throw new Error(`Failed to save file to GitHub: ${response.statusText}`)
		}

		const data = await response.json()
		if (data && data.content && data.content.sha) {
			this.shaCache.set(name, data.content.sha)
		}
	}

	public async deleteWork(name: string): Promise<void> {
		const repoPath = this.getRepoPath()
		let sha = this.shaCache.get(name)

		if (!sha) {
			sha = await this.fetchLatestSha(name)
		}

		if (!sha) {
			throw new Error(`Cannot delete file without known sha checksum: ${name}`)
		}

		const commitMessage = `Delete ${name}`
		const response = await fetch(this.githubApi(`/repos/${repoPath}/contents/${encodeURI(name)}`), {
			method: "DELETE",
			credentials: "include",
			headers: this.getHeaders(),
			body: JSON.stringify({
				message: commitMessage,
				sha: sha,
			}),
		})

		if (!response.ok) {
			throw new Error(`Failed to delete file from GitHub: ${response.statusText}`)
		}

		this.shaCache.delete(name)
	}
}
