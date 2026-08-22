import { CloudSyncService } from "../services/cloudSyncService"
import { CloudSyncStatus, CloudUser } from "../services/storageAdapter"

export class CloudSyncUiController {
	private loginBtn: HTMLButtonElement | null = null
	private loginText: HTMLElement | null = null
	private syncBtn: HTMLButtonElement | null = null
	private syncIcon: HTMLElement | null = null
	private syncText: HTMLElement | null = null

	public constructor(private readonly syncService: CloudSyncService) {}

	public initialize(container?: HTMLElement | null): void {
		this.loginBtn = (container?.querySelector("#cloudLoginBtn") || document.getElementById("cloudLoginBtn")) as HTMLButtonElement | null
		this.loginText = container?.querySelector("#cloudLoginText") || document.getElementById("cloudLoginText")
		this.syncBtn = (container?.querySelector("#cloudSyncNowBtn") || document.getElementById("cloudSyncNowBtn")) as HTMLButtonElement | null
		this.syncIcon = container?.querySelector("#cloudSyncIcon") || document.getElementById("cloudSyncIcon")
		this.syncText = container?.querySelector("#cloudSyncText") || document.getElementById("cloudSyncText")

		if (this.loginBtn) {
			this.loginBtn.addEventListener("click", () => this.handleAuthToggle())
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

	private async handleAuthToggle(): Promise<void> {
		if (this.syncService.isAuthenticated()) {
			if (confirm("Disconnect Google Drive sync?")) {
				await this.syncService.logout()
			}
		} else {
			try {
				if (!this.syncService.getAdapter()) {
					const clientId = prompt("Please enter your Google OAuth Client ID (or configure VITE_GOOGLE_CLIENT_ID in .env.local):")
					if (clientId && clientId.trim()) {
						const { GoogleDriveStorageAdapter } = await import("../services/googleDriveStorageAdapter")
						this.syncService.setAdapter(new GoogleDriveStorageAdapter({ clientId: clientId.trim() }))
					} else {
						return
					}
				}
				await this.syncService.login()
				try {
					await this.syncService.syncAll()
				} catch (syncErr: any) {
					console.error("[CloudSync Error]", syncErr)
					alert(`Google Drive Sync Note: ${syncErr?.message || syncErr}`)
				}
			} catch (err: any) {
				alert(`Failed to log in to Google Drive: ${err?.message || err}`)
			}
		}
	}

	private async handleManualSync(): Promise<void> {
		if (!this.syncService.isAuthenticated()) {
			alert("Please log in to Google Drive first.")
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
		if (!this.loginBtn) return

		if (user) {
			if (this.loginText) {
				this.loginText.textContent = user.name || user.email
			}
			this.loginBtn.classList.remove("btn-outline-success")
			this.loginBtn.classList.add("btn-success")

			if (this.syncBtn) {
				this.syncBtn.classList.remove("d-none")
			}
		} else {
			if (this.loginText) {
				this.loginText.textContent = "Login Google"
			}
			this.loginBtn.classList.remove("btn-success")
			this.loginBtn.classList.add("btn-outline-success")

			if (this.syncBtn) {
				this.syncBtn.classList.add("d-none")
			}
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
