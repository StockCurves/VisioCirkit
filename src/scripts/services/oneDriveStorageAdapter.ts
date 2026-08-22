import { PublicClientApplication } from "@azure/msal-browser"
import { CloudFile, CloudUser, IStorageAdapter } from "./storageAdapter"

export interface OneDriveConfig {
	clientId: string
	scope?: string
	redirectUri?: string
	tenant?: string // "consumers" | "common" | "organizations"
}

const SESSION_STORAGE_KEY = "visiocirkit_onedrive_session"
const ONEDRIVE_FOLDER_NAME = "VisioCirkit"

export class OneDriveStorageAdapter implements IStorageAdapter {
	public readonly providerId = "one-drive"
	public readonly providerName = "Microsoft OneDrive"

	private accessToken: string | null = null
	private currentUser: CloudUser | null = null
	private fetchImpl: typeof fetch

	private readonly scope: string
	private readonly redirectUri: string
	private readonly tenant: string

	public constructor(
		private readonly config: OneDriveConfig,
		customFetch?: typeof fetch
	) {
		this.scope = config.scope || "Files.ReadWrite User.Read"
		this.redirectUri = config.redirectUri || (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "")
		this.tenant = config.tenant || "consumers"
		this.fetchImpl = customFetch || ((...args) => globalThis.fetch(...args))
		this.restoreSession()
	}

	private restoreSession(): void {
		if (typeof window === "undefined" || !window.localStorage) return
		try {
			if (window.location.hash && window.location.hash.includes("access_token=")) {
				const params = new URLSearchParams(window.location.hash.replace(/^#/, ""))
				const token = params.get("access_token")
				if (token) {
					this.accessToken = token
					if (window.history && window.history.replaceState) {
						window.history.replaceState(null, "", window.location.pathname + window.location.search)
					}
					void this.fetchUserProfile().then(() => this.saveSession()).catch(() => {})
					return
				}
			}

			const stored = localStorage.getItem(SESSION_STORAGE_KEY)
			if (stored) {
				const session = JSON.parse(stored)
				if (session.accessToken && session.currentUser && session.expiresAt > Date.now() && session.scope === this.scope) {
					this.accessToken = session.accessToken
					this.currentUser = session.currentUser
				} else {
					localStorage.removeItem(SESSION_STORAGE_KEY)
				}
			}
		} catch {
			// Ignore parse error
		}
	}

	private saveSession(): void {
		if (typeof window === "undefined" || !window.localStorage) return
		if (this.accessToken && this.currentUser) {
			const session = {
				accessToken: this.accessToken,
				currentUser: this.currentUser,
				scope: this.scope,
				expiresAt: Date.now() + 3500 * 1000,
			}
			localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session))
		} else {
			localStorage.removeItem(SESSION_STORAGE_KEY)
		}
	}

	public setAccessToken(token: string): void {
		this.accessToken = token
		this.saveSession()
	}

	public getAccessToken(): string | null {
		return this.accessToken
	}

	public setUser(user: CloudUser | null): void {
		this.currentUser = user
		this.saveSession()
	}

	public getUser(): CloudUser | null {
		return this.currentUser
	}

	public isAuthenticated(): boolean {
		return this.accessToken !== null && this.currentUser !== null
	}

	public async login(): Promise<CloudUser> {
		if (this.isAuthenticated() && this.currentUser) {
			return this.currentUser
		}

		try {
			return await this.performLogin(this.tenant)
		} catch (err: any) {
			const errMsg = err?.message || ""
			if (errMsg.includes("unauthorized_client") || errMsg.includes("consumers")) {
				const fallbackTenant = this.tenant === "consumers" ? "common" : "consumers"
				console.warn(`[OneDrive] Tenant '${this.tenant}' failed with: ${errMsg}. Retrying with '${fallbackTenant}'...`)
				try {
					return await this.performLogin(fallbackTenant)
				} catch (retryErr: any) {
					throw new Error(
						`Azure App Registration error (unauthorized_client).\n` +
							`Please verify in Azure Portal that "Supported account types" is set to "Accounts in any organizational directory and personal Microsoft accounts" (Multitenant + Personal) or "Personal Microsoft accounts only".`
					)
				}
			}
			throw err
		}
	}

	private async performLogin(tenant: string): Promise<CloudUser> {
		// Use MSAL.js so Microsoft can run the authorization-code + PKCE flow for browser apps.
		if (typeof window !== "undefined") {
			const msalConfig = {
				auth: {
					clientId: this.config.clientId,
					authority: `https://login.microsoftonline.com/${tenant}`,
					redirectUri: this.redirectUri,
				},
				cache: {
					cacheLocation: "localStorage",
				},
			}
			const msalInstance = new PublicClientApplication(msalConfig)
			if (msalInstance.initialize) {
				await msalInstance.initialize()
			}
			const authResult = await msalInstance.loginPopup({
				scopes: this.scope.split(" "),
			})
			this.accessToken = authResult.accessToken
			this.currentUser = await this.fetchUserProfile()
			this.saveSession()
			return this.currentUser
		}

		throw new Error("OneDrive login unsupported in current environment")
	}

	public async logout(): Promise<void> {
		this.accessToken = null
		this.currentUser = null
		this.saveSession()
	}

	private async extractError(res: Response, fallback: string): Promise<Error> {
		try {
			const body = await res.json()
			if (body?.error?.message) {
				return new Error(`${fallback}: ${body.error.message}`)
			}
		} catch {
			// Ignore JSON parsing error
		}
		return new Error(`${fallback}: HTTP ${res.status} ${res.statusText}`)
	}

	private getFolderPath(): string {
		return encodeURIComponent(ONEDRIVE_FOLDER_NAME)
	}

	private isGraphNotFoundError(error: Error): boolean {
		return error.message.includes("Item not found") || error.message.includes("The resource could not be found")
	}

	private isMissingUploadFolderError(error: Error): boolean {
		return error.message.includes("Failed to upload file") && this.isGraphNotFoundError(error)
	}

	private async createFolder(): Promise<void> {
		const res = await this.fetchImpl("https://graph.microsoft.com/v1.0/me/drive/root/children", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: ONEDRIVE_FOLDER_NAME,
				folder: {},
				"@microsoft.graph.conflictBehavior": "replace",
			}),
		})

		if (!res.ok) {
			throw await this.extractError(res, "Failed to create OneDrive folder")
		}
	}

	public async fetchUserProfile(): Promise<CloudUser> {
		this.ensureAuthenticated()
		const res = await this.fetchImpl("https://graph.microsoft.com/v1.0/me", {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!res.ok) {
			throw await this.extractError(res, "Failed to fetch Microsoft profile")
		}

		const data = await res.json()
		const user: CloudUser = {
			id: data.id,
			name: data.displayName || data.userPrincipalName || data.mail,
			email: data.mail || data.userPrincipalName || "",
		}
		this.currentUser = user
		return user
	}

	public async listFiles(): Promise<CloudFile[]> {
		this.ensureAuthenticated()
		const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${this.getFolderPath()}:/children`
		const res = await this.fetchImpl(url, {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!res.ok) {
			const error = await this.extractError(res, "Failed to list files from OneDrive folder")
			if (this.isGraphNotFoundError(error)) {
				await this.createFolder()
				return []
			}
			throw error
		}

		const data = await res.json()
		return (data.value || []).map((file: any) => ({
			id: file.id,
			name: file.name,
			mimeType: file.file?.mimeType || "text/plain",
			updatedAt: file.lastModifiedDateTime ? new Date(file.lastModifiedDateTime).getTime() : Date.now(),
		}))
	}

	public async getFile(fileId: string): Promise<string> {
		this.ensureAuthenticated()
		const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/content`
		const res = await this.fetchImpl(url, {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!res.ok) {
			throw await this.extractError(res, `Failed to download file ${fileId} from OneDrive`)
		}

		return res.text()
	}

	public async saveFile(name: string, content: string, _fileId?: string): Promise<CloudFile> {
		this.ensureAuthenticated()
		const encodedName = encodeURIComponent(name)
		const url = `https://graph.microsoft.com/v1.0/me/drive/root:/${this.getFolderPath()}/${encodedName}:/content`

		const upload = () =>
			this.fetchImpl(url, {
				method: "PUT",
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					"Content-Type": "text/plain; charset=utf-8",
				},
				body: content,
			})

		let res = await upload()

		if (!res.ok) {
			const error = await this.extractError(res, `Failed to upload file ${name} to OneDrive`)
			if (this.isMissingUploadFolderError(error)) {
				await this.createFolder()
				res = await upload()
			} else {
				throw error
			}
		}

		if (!res.ok) {
			throw await this.extractError(res, `Failed to upload file ${name} to OneDrive`)
		}

		const data = await res.json()
		return {
			id: data.id,
			name: data.name || name,
			content,
			mimeType: data.file?.mimeType || "text/plain",
			updatedAt: data.lastModifiedDateTime ? new Date(data.lastModifiedDateTime).getTime() : Date.now(),
		}
	}

	public async deleteFile(fileId: string): Promise<void> {
		this.ensureAuthenticated()
		const url = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`
		const res = await this.fetchImpl(url, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!res.ok && res.status !== 404) {
			throw await this.extractError(res, `Failed to delete file ${fileId} from OneDrive`)
		}
	}

	private ensureAuthenticated(): void {
		if (!this.accessToken) {
			throw new Error("User is not authenticated with Microsoft OneDrive")
		}
	}
}
