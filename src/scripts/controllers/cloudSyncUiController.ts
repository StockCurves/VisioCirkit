import { CloudSyncService } from "../services/cloudSyncService"
import { CloudSyncStatus, CloudUser } from "../services/storageAdapter"

export class CloudSyncUiController {
	private loginBtn: HTMLButtonElement | null = null
	private loginText: HTMLElement | null = null
	private providerIcon: HTMLElement | null = null
	private syncBtn: HTMLButtonElement | null = null
	private syncIcon: HTMLElement | null = null
	private syncText: HTMLElement | null = null

	private googleOpt: HTMLElement | null = null
	private oneDriveOpt: HTMLElement | null = null
	private logoutItem: HTMLElement | null = null
	private logoutContainer: HTMLElement | null = null
	private logoutBtn: HTMLElement | null = null

	public constructor(private readonly syncService: CloudSyncService) {}

	public initialize(container?: HTMLElement | null): void {
		const doc = container || document
		this.loginBtn = doc.querySelector("#cloudLoginBtn") as HTMLButtonElement | null
		this.loginText = doc.querySelector("#cloudLoginText")
		this.providerIcon = doc.querySelector("#cloudProviderIcon")
		this.syncBtn = doc.querySelector("#cloudSyncNowBtn") as HTMLButtonElement | null
		this.syncIcon = doc.querySelector("#cloudSyncIcon")
		this.syncText = doc.querySelector("#cloudSyncText")

		this.googleOpt = doc.querySelector("#selectGoogleDriveOpt")
		this.oneDriveOpt = doc.querySelector("#selectOneDriveOpt")
		this.logoutItem = doc.querySelector("#cloudLogoutItem")
		this.logoutContainer = doc.querySelector("#cloudLogoutContainer")
		this.logoutBtn = doc.querySelector("#cloudLogoutBtn")

		if (this.googleOpt) {
			this.googleOpt.addEventListener("click", (e) => {
				e.preventDefault()
				void this.selectProviderAndLogin("google-drive")
			})
		}

		if (this.oneDriveOpt) {
			this.oneDriveOpt.addEventListener("click", (e) => {
				e.preventDefault()
				void this.selectProviderAndLogin("one-drive")
			})
		}

		if (this.logoutBtn) {
			this.logoutBtn.addEventListener("click", (e) => {
				e.preventDefault()
				void this.handleLogout()
			})
		}

		if (this.syncBtn) {
			this.syncBtn.addEventListener("click", () => this.handleManualSync())
		}

		this.syncService.onUserChange((user) => this.renderUser(user))
		this.syncService.onStatusChange((status) => this.renderStatus(status))

		// Render initial state
		this.renderUser(this.syncService.getUser())
		this.renderStatus(this.syncService.getStatus())

		if (this.syncService.isAuthenticated()) {
			void this.syncService.syncAll().catch((err) => {
				console.error("[CloudSync auto-sync on load failed]", err)
			})
		}
	}

	public async selectProviderAndLogin(providerId: "google-drive" | "one-drive"): Promise<void> {
		const currentAdapter = this.syncService.getAdapter()
		if (currentAdapter?.providerId === providerId && this.syncService.isAuthenticated()) {
			return
		}

		if (providerId === "google-drive") {
			const clientId = (process.env.VITE_GOOGLE_CLIENT_ID || (window as any).VITE_GOOGLE_CLIENT_ID || "").trim()
			if (!clientId) {
				const entered = prompt("Please enter your Google OAuth Client ID:")
				if (!entered) return
				const { GoogleDriveStorageAdapter } = await import("../services/googleDriveStorageAdapter")
				this.syncService.setAdapter(new GoogleDriveStorageAdapter({ clientId: entered.trim() }))
			} else {
				const { GoogleDriveStorageAdapter } = await import("../services/googleDriveStorageAdapter")
				this.syncService.setAdapter(new GoogleDriveStorageAdapter({ clientId }))
			}
		} else if (providerId === "one-drive") {
			const clientId = (process.env.VITE_ONEDRIVE_CLIENT_ID || (window as any).VITE_ONEDRIVE_CLIENT_ID || "").trim()
			const tenant = (process.env.VITE_ONEDRIVE_TENANT || (window as any).VITE_ONEDRIVE_TENANT || "consumers").trim()
			if (!clientId) {
				const entered = prompt("Please enter your Microsoft OneDrive Client ID (Azure Application ID):")
				if (!entered) return
				const { OneDriveStorageAdapter } = await import("../services/oneDriveStorageAdapter")
				this.syncService.setAdapter(new OneDriveStorageAdapter({ clientId: entered.trim(), tenant }))
			} else {
				const { OneDriveStorageAdapter } = await import("../services/oneDriveStorageAdapter")
				this.syncService.setAdapter(new OneDriveStorageAdapter({ clientId, tenant }))
			}
		}

		try {
			await this.syncService.login()
			try {
				await this.syncService.syncAll()
			} catch (syncErr: any) {
				console.error("[CloudSync Error]", syncErr)
				alert(`Cloud Sync Note: ${syncErr?.message || syncErr}`)
			}
		} catch (err: any) {
			alert(`Failed to log in: ${err?.message || err}`)
		}
	}

	private async handleLogout(): Promise<void> {
		if (confirm("Disconnect Cloud Storage?")) {
			await this.syncService.logout()
		}
	}

	private async handleManualSync(): Promise<void> {
		if (!this.syncService.isAuthenticated()) {
			alert("Please select and log in to a cloud storage provider first.")
			return
		}

		try {
			const res = await this.syncService.syncAll()
			alert(`Sync Complete!\nUploaded: ${res.workFilesUploaded} files\nDownloaded: ${res.workFilesDownloaded} files`)
		} catch (err: any) {
			alert(`Sync failed: ${err?.message || err}`)
		}
	}

	public renderUser(user: CloudUser | null): void {
		const adapter = this.syncService.getAdapter()

		if (user && adapter) {
			const icon = adapter.providerId === "google-drive" ? "🟢" : "🟦"
			if (this.providerIcon) this.providerIcon.textContent = icon
			if (this.loginText) this.loginText.textContent = user.name || user.email

			if (this.loginBtn) {
				this.loginBtn.classList.remove("btn-outline-success")
				this.loginBtn.classList.add("btn-success")
			}
			if (this.syncBtn) this.syncBtn.classList.remove("d-none")
			if (this.logoutItem) this.logoutItem.classList.remove("d-none")
			if (this.logoutContainer) this.logoutContainer.classList.remove("d-none")
		} else {
			if (this.providerIcon) this.providerIcon.textContent = "☁️"
			if (this.loginText) this.loginText.textContent = "Cloud Storage"

			if (this.loginBtn) {
				this.loginBtn.classList.remove("btn-success")
				this.loginBtn.classList.add("btn-outline-success")
			}
			if (this.syncBtn) this.syncBtn.classList.add("d-none")
			if (this.logoutItem) this.logoutItem.classList.add("d-none")
			if (this.logoutContainer) this.logoutContainer.classList.add("d-none")
		}
	}

	public renderStatus(status: CloudSyncStatus): void {
		if (!this.syncBtn) return

		if (status === "syncing") {
			this.syncBtn.disabled = true
			if (this.syncIcon) this.syncIcon.textContent = "⏳"
			if (this.syncText) this.syncText.textContent = "Syncing..."
		} else if (status === "synced") {
			this.syncBtn.disabled = false
			if (this.syncIcon) this.syncIcon.textContent = "✅"
			if (this.syncText) this.syncText.textContent = "Synced"
		} else if (status === "error") {
			this.syncBtn.disabled = false
			if (this.syncIcon) this.syncIcon.textContent = "⚠️"
			if (this.syncText) this.syncText.textContent = "Error"
		} else {
			this.syncBtn.disabled = false
			if (this.syncIcon) this.syncIcon.textContent = "🔄"
			if (this.syncText) this.syncText.textContent = "Sync"
		}
	}
}
