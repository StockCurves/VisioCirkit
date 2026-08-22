import { describe, expect, it, vi } from "vitest"
import { CloudSyncUiController } from "../src/scripts/controllers/cloudSyncUiController"
import { CloudSyncService } from "../src/scripts/services/cloudSyncService"

describe("CloudSyncUiController", () => {
	const createMockService = () => {
		let user: any = null
		let status: any = "idle"
		const userListeners: any[] = []
		const statusListeners: any[] = []

		return {
			getUser: () => user,
			getStatus: () => status,
			getAdapter: () => ({ providerId: "mock" }),
			isAuthenticated: () => user !== null,
			onUserChange: (l: any) => {
				userListeners.push(l)
				return () => {}
			},
			onStatusChange: (l: any) => {
				statusListeners.push(l)
				return () => {}
			},
			login: vi.fn().mockImplementation(async () => {
				user = { id: "1", name: "Google User", email: "g@example.com" }
				userListeners.forEach((l) => l(user))
			}),
			logout: vi.fn().mockImplementation(async () => {
				user = null
				userListeners.forEach((l) => l(null))
			}),
			syncAll: vi.fn().mockResolvedValue({ workFilesUploaded: 2, workFilesDownloaded: 1, customSymbolsSynced: true }),
			emitStatus: (s: any) => {
				status = s
				statusListeners.forEach((l) => l(s))
			},
		}
	}

	it("initializes DOM elements and renders unauthenticated state", () => {
		document.body.innerHTML = `
			<div id="cloudSyncNavContainer">
				<button id="cloudLoginBtn"><span id="cloudLoginText">Login Google</span></button>
				<button id="cloudSyncNowBtn" class="d-none"><span id="cloudSyncIcon">🔄</span><span id="cloudSyncText">Sync</span></button>
			</div>
		`

		const service = createMockService() as any
		const controller = new CloudSyncUiController(service)
		controller.initialize()

		const loginText = document.getElementById("cloudLoginText")
		const syncBtn = document.getElementById("cloudSyncNowBtn")

		expect(loginText?.textContent).toBe("Login Google")
		expect(syncBtn?.classList.contains("d-none")).toBe(true)
	})

	it("updates UI when user logs in and out", async () => {
		document.body.innerHTML = `
			<div id="cloudSyncNavContainer">
				<button id="cloudLoginBtn"><span id="cloudLoginText">Login Google</span></button>
				<button id="cloudSyncNowBtn" class="d-none"><span id="cloudSyncIcon">🔄</span><span id="cloudSyncText">Sync</span></button>
			</div>
		`

		const service = createMockService() as any
		const controller = new CloudSyncUiController(service)
		controller.initialize()

		const loginBtn = document.getElementById("cloudLoginBtn") as HTMLButtonElement
		loginBtn.click()

		expect(service.login).toHaveBeenCalled()
		const loginText = document.getElementById("cloudLoginText")
		const syncBtn = document.getElementById("cloudSyncNowBtn")

		expect(loginText?.textContent).toBe("Google User")
		expect(syncBtn?.classList.contains("d-none")).toBe(false)
	})

	it("renders syncing and synced status states", () => {
		document.body.innerHTML = `
			<div id="cloudSyncNavContainer">
				<button id="cloudLoginBtn"><span id="cloudLoginText">Login Google</span></button>
				<button id="cloudSyncNowBtn"><span id="cloudSyncIcon">🔄</span><span id="cloudSyncText">Sync</span></button>
			</div>
		`

		const service = createMockService() as any
		const controller = new CloudSyncUiController(service)
		controller.initialize()

		service.emitStatus("syncing")
		const syncIcon = document.getElementById("cloudSyncIcon")
		const syncText = document.getElementById("cloudSyncText")
		expect(syncIcon?.textContent).toBe("⏳")
		expect(syncText?.textContent).toBe("Syncing...")

		service.emitStatus("synced")
		expect(syncIcon?.textContent).toBe("✅")
		expect(syncText?.textContent).toBe("Synced")
	})
})
