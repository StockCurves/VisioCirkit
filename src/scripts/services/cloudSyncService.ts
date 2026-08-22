import { CustomSymbolRepository } from "./customSymbolRepository"
import { CloudFile, CloudSyncStatus, CloudUser, IStorageAdapter } from "./storageAdapter"
import { WorkFileRepository } from "./workFileRepository"

export interface CloudSyncResult {
	workFilesUploaded: number
	workFilesDownloaded: number
	customSymbolsSynced: boolean
}

export class CloudSyncService {
	private adapter: IStorageAdapter | null = null
	private status: CloudSyncStatus = "idle"
	private statusListeners: Array<(status: CloudSyncStatus) => void> = []
	private userListeners: Array<(user: CloudUser | null) => void> = []
	private autoSyncEnabled: boolean = false

	public constructor(
		private readonly workFileRepo: WorkFileRepository,
		private readonly customSymbolRepo: CustomSymbolRepository
	) {}

	public setAdapter(adapter: IStorageAdapter | null): void {
		this.adapter = adapter
		this.notifyUserChange(this.getUser())
	}

	public getAdapter(): IStorageAdapter | null {
		return this.adapter
	}

	public getUser(): CloudUser | null {
		return this.adapter ? this.adapter.getUser() : null
	}

	public isAuthenticated(): boolean {
		return this.adapter !== null && this.adapter.isAuthenticated()
	}

	public getStatus(): CloudSyncStatus {
		return this.status
	}

	public isAutoSyncEnabled(): boolean {
		return this.autoSyncEnabled
	}

	public setAutoSyncEnabled(enabled: boolean): void {
		this.autoSyncEnabled = enabled
	}

	public onStatusChange(listener: (status: CloudSyncStatus) => void): () => void {
		this.statusListeners.push(listener)
		return () => {
			this.statusListeners = this.statusListeners.filter((l) => l !== listener)
		}
	}

	public onUserChange(listener: (user: CloudUser | null) => void): () => void {
		this.userListeners.push(listener)
		return () => {
			this.userListeners = this.userListeners.filter((l) => l !== listener)
		}
	}

	private setStatus(newStatus: CloudSyncStatus): void {
		this.status = newStatus
		for (const listener of this.statusListeners) {
			try {
				listener(newStatus)
			} catch {
				// Ignore errors in listener
			}
		}
	}

	private notifyUserChange(user: CloudUser | null): void {
		for (const listener of this.userListeners) {
			try {
				listener(user)
			} catch {
				// Ignore errors in listener
			}
		}
	}

	public async login(): Promise<CloudUser> {
		if (!this.adapter) {
			throw new Error("No storage adapter configured")
		}
		const user = await this.adapter.login()
		this.notifyUserChange(user)
		return user
	}

	public async logout(): Promise<void> {
		if (this.adapter) {
			await this.adapter.logout()
		}
		this.notifyUserChange(null)
		this.setStatus("idle")
	}

	public async saveFileToCloud(name: string, content: string): Promise<void> {
		if (!this.adapter || !this.adapter.isAuthenticated()) return
		try {
			this.setStatus("syncing")
			const cloudFiles = await this.adapter.listFiles()
			const existing = cloudFiles.find((f) => f.name === name)
			await this.adapter.saveFile(name, content, existing?.id)
			this.setStatus("synced")
		} catch (err) {
			console.error("[CloudSync saveFileToCloud error]", err)
			this.setStatus("error")
		}
	}

	public async syncAll(): Promise<CloudSyncResult> {
		if (!this.adapter || !this.adapter.isAuthenticated()) {
			throw new Error("Cannot sync: User is not authenticated")
		}

		this.setStatus("syncing")

		try {
			const cloudFiles = await this.adapter.listFiles()
			const cloudFilesMap = new Map<string, CloudFile>()
			for (const f of cloudFiles) {
				cloudFilesMap.set(f.name, f)
			}

			// 1. Sync Work Files (.tex files)
			const localWorkFiles = await this.workFileRepo.listWorkFiles()
			let workFilesUploaded = 0
			let workFilesDownloaded = 0

			for (const localFile of localWorkFiles) {
				const cloudMatch = cloudFilesMap.get(localFile.name)
				if (!cloudMatch) {
					// Upload to cloud
					await this.adapter.saveFile(localFile.name, localFile.content)
					workFilesUploaded++
				} else if (localFile.updatedAt > cloudMatch.updatedAt + 3000) {
					// Local file is significantly newer, update cloud
					await this.adapter.saveFile(localFile.name, localFile.content, cloudMatch.id)
					workFilesUploaded++
				} else if (cloudMatch.updatedAt > localFile.updatedAt + 3000) {
					// Cloud file is significantly newer, download to local
					const cloudContent = await this.adapter.getFile(cloudMatch.id)
					await this.workFileRepo.putWorkFile(localFile.name, cloudContent)
					workFilesDownloaded++
				}
				// Remove processed file from map
				cloudFilesMap.delete(localFile.name)
			}

			// Download remaining cloud files that don't exist locally (except custom-symbols.json)
			for (const [name, cloudFile] of cloudFilesMap.entries()) {
				if (name === "custom-symbols.json") continue
				const cloudContent = await this.adapter.getFile(cloudFile.id)
				await this.workFileRepo.putWorkFile(name, cloudContent)
				workFilesDownloaded++
			}

			// 2. Sync Custom Symbols
			const customSymbolsSynced = await this.syncCustomSymbols(cloudFiles)

			this.setStatus("synced")
			return {
				workFilesUploaded,
				workFilesDownloaded,
				customSymbolsSynced,
			}
		} catch (error) {
			this.setStatus("error")
			throw error
		}
	}

	private async syncCustomSymbols(cloudFiles: CloudFile[]): Promise<boolean> {
		if (!this.adapter) return false

		const cloudSymbolFile = cloudFiles.find((f) => f.name === "custom-symbols.json")
		const localSymbols = await this.customSymbolRepo.getCustomSymbols()

		if (!cloudSymbolFile) {
			// No cloud custom symbols, upload local symbols if available
			if (localSymbols.length > 0) {
				await this.adapter.saveFile("custom-symbols.json", JSON.stringify(localSymbols, null, 2))
				return true
			}
			return false
		}

		// Cloud custom symbols file exists, download & merge
		const cloudContent = await this.adapter.getFile(cloudSymbolFile.id)
		try {
			const cloudSymbols = JSON.parse(cloudContent)
			if (Array.isArray(cloudSymbols)) {
				// Merge local and cloud custom symbols by name
				const symbolMap = new Map<string, any>()
				for (const sym of localSymbols) {
					if (sym && sym.name) symbolMap.set(sym.name, sym)
				}
				for (const sym of cloudSymbols) {
					if (sym && sym.name && !symbolMap.has(sym.name)) {
						symbolMap.set(sym.name, sym)
					}
				}

				const mergedSymbols = Array.from(symbolMap.values())
				await this.customSymbolRepo.saveCustomSymbols(mergedSymbols)

				// Re-upload merged result to cloud if local had extra symbols
				if (mergedSymbols.length > cloudSymbols.length) {
					await this.adapter.saveFile(
						"custom-symbols.json",
						JSON.stringify(mergedSymbols, null, 2),
						cloudSymbolFile.id
					)
				}
				return true
			}
		} catch {
			// If JSON parse fails, ignore custom symbol merge
		}

		return false
	}
}
