import { CustomSymbolRepository } from "./customSymbolRepository"

export class GitHubCustomSymbolSyncService {
	private debounceTimer: any = null
	private categoriesSha: string | null = null
	private symbolShas = new Map<string, string>()
	private owner: string | null = null

	public constructor(
		private readonly apiBase: string,
		private readonly repository: CustomSymbolRepository
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

	private async resolveOwner(): Promise<string> {
		if (this.owner) return this.owner
		const response = await fetch(this.githubApi("/user"), {
			credentials: "include",
			headers: this.getHeaders(),
		})
		if (!response.ok) {
			throw new Error("Failed to fetch user profile for owner resolution")
		}
		const data = await response.json()
		this.owner = data.login
		return this.owner!
	}

	public async ensureLibraryRepo(): Promise<string> {
		const owner = await this.resolveOwner()
		const checkResponse = await fetch(this.githubApi(`/repos/${owner}/visiocirkit-library`), {
			credentials: "include",
			headers: this.getHeaders(),
		})

		if (checkResponse.ok) {
			return `${owner}/visiocirkit-library`
		}

		if (checkResponse.status === 404) {
			const createResponse = await fetch(this.githubApi("/user/repos"), {
				method: "POST",
				credentials: "include",
				headers: this.getHeaders(),
				body: JSON.stringify({
					name: "visiocirkit-library",
					private: true,
					description: "VisioCirkit global component library",
				}),
			})
			if (!createResponse.ok) {
				throw new Error(`Failed to create repository: ${createResponse.statusText}`)
			}
			return `${owner}/visiocirkit-library`
		}

		throw new Error(`Error verifying library repository: ${checkResponse.statusText}`)
	}

	public async sync(): Promise<void> {
		const repoPath = await this.ensureLibraryRepo()

		// 1. Pull remote categories
		let remoteCategories: any[] = []
		try {
			const catRes = await fetch(this.githubApi(`/repos/${repoPath}/contents/categories.json`), {
				credentials: "include",
				headers: this.getHeaders(),
			})
			if (catRes.ok) {
				const catData = await catRes.json()
				this.categoriesSha = catData.sha
				const binString = atob(catData.content.replace(/\s/g, ""))
				remoteCategories = JSON.parse(new TextDecoder().decode(Uint8Array.from(binString, (m) => m.charCodeAt(0))))
			}
		} catch (e) {
			console.warn("No categories.json found in remote library, starting fresh.")
		}

		// 2. Pull remote symbols
		const remoteSymbols = new Map<string, any>()
		try {
			const treeRes = await fetch(this.githubApi(`/repos/${repoPath}/git/trees/main?recursive=1`), {
				credentials: "include",
				headers: this.getHeaders(),
			})
			if (treeRes.ok) {
				const treeData = await treeRes.json()
				if (treeData && Array.isArray(treeData.tree)) {
					for (const node of treeData.tree) {
						if (node.path.startsWith("symbols/") && node.path.endsWith(".json")) {
							const symId = node.path.substring(8, node.path.length - 5) // strip symbols/ and .json
							this.symbolShas.set(symId, node.sha)

							// Fetch symbol content
							const symRes = await fetch(this.githubApi(`/repos/${repoPath}/contents/${encodeURI(node.path)}`), {
								credentials: "include",
								headers: this.getHeaders(),
							})
							if (symRes.ok) {
								const symData = await symRes.json()
								const binString = atob(symData.content.replace(/\s/g, ""))
								const parsedSym = JSON.parse(new TextDecoder().decode(Uint8Array.from(binString, (m) => m.charCodeAt(0))))
								remoteSymbols.set(symId, parsedSym)
							}
						}
					}
				}
			}
		} catch (e) {
			console.warn("Failed to fetch remote symbols tree:", e)
		}

		// 3. Get local data
		const localSymbols = await this.repository.getCustomSymbols()
		const localCategories = await this.repository.getCustomCategories()

		// 4. Merge Symbols
		const localSymbolsMap = new Map(localSymbols.map((s) => [s.id, s]))

		// Update or Insert remote symbols into local
		for (const [id, rSym] of remoteSymbols.entries()) {
			const lSym = localSymbolsMap.get(id)
			const rUpdate = typeof rSym.updatedAt === "number" ? rSym.updatedAt : 0
			const lUpdate = lSym && typeof lSym.updatedAt === "number" ? lSym.updatedAt : 0

			if (!lSym || rUpdate > lUpdate) {
				await this.repository.putCustomSymbol(rSym)
			}
		}

		// Push local symbols that are newer or missing remote
		let needsPush = false
		for (const lSym of localSymbols) {
			const rSym = remoteSymbols.get(lSym.id)
			const rUpdate = rSym && typeof rSym.updatedAt === "number" ? rSym.updatedAt : 0
			const lUpdate = typeof lSym.updatedAt === "number" ? lSym.updatedAt : 0

			if (!rSym || lUpdate > rUpdate) {
				needsPush = true
			}
		}

		// 5. Merge Categories
		const localCatMap = new Map(localCategories.map((c) => [c.name, c]))
		for (const rCat of remoteCategories) {
			const lCat = localCatMap.get(rCat.name)
			if (!lCat) {
				await this.repository.putCustomCategory(rCat)
			}
		}

		if (needsPush) {
			this.triggerPush()
		}
	}

	public triggerPush(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer)
		}
		this.debounceTimer = setTimeout(() => {
			this.pushLocalToRemote().catch((err) => {
				console.error("Failed background library push:", err)
			})
		}, 3000)
	}

	private async pushLocalToRemote(): Promise<void> {
		const repoPath = await this.ensureLibraryRepo()

		const localSymbols = await this.repository.getCustomSymbols()
		const localCategories = await this.repository.getCustomCategories()

		// 1. Push categories.json
		const catBytes = new TextEncoder().encode(JSON.stringify(localCategories))
		const catBase64 = btoa(String.fromCharCode(...catBytes))
		const catRes = await fetch(this.githubApi(`/repos/${repoPath}/contents/categories.json`), {
			method: "PUT",
			credentials: "include",
			headers: this.getHeaders(),
			body: JSON.stringify({
				message: "Sync component categories",
				content: catBase64,
				sha: this.categoriesSha || undefined,
			}),
		})
		if (catRes.ok) {
			const catData = await catRes.json()
			this.categoriesSha = catData.content.sha
		}

		// 2. Push symbols
		for (const sym of localSymbols) {
			// Ensure updatedAt exists
			if (!sym.updatedAt) {
				sym.updatedAt = Date.now()
			}
			const symId = sym.id
			const symPath = `symbols/${symId}.json`
			const symBytes = new TextEncoder().encode(JSON.stringify(sym))
			const symBase64 = btoa(String.fromCharCode(...symBytes))
			const sha = this.symbolShas.get(symId)

			const symRes = await fetch(this.githubApi(`/repos/${repoPath}/contents/${encodeURI(symPath)}`), {
				method: "PUT",
				credentials: "include",
				headers: this.getHeaders(),
				body: JSON.stringify({
					message: `Sync symbol ${sym.displayName}`,
					content: symBase64,
					sha: sha || undefined,
				}),
			})
			if (symRes.ok) {
				const symData = await symRes.json()
				this.symbolShas.set(symId, symData.content.sha)
			}
		}
	}
}
