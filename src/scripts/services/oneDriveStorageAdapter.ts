import { CloudFile, CloudUser, IStorageAdapter } from "./storageAdapter"

export interface OneDriveConfig {
	clientId: string
	scope?: string
	redirectUri?: string
}

const SESSION_STORAGE_KEY = "visiocirkit_onedrive_session"

export class OneDriveStorageAdapter implements IStorageAdapter {
	public readonly providerId = "one-drive"
	public readonly providerName = "Microsoft OneDrive"

	private accessToken: string | null = null
	private currentUser: CloudUser | null = null
	private fetchImpl: typeof fetch

	private readonly scope: string
	private readonly redirectUri: string

	public constructor(
		private readonly config: OneDriveConfig,
		customFetch?: typeof fetch
	) {
		this.scope = config.scope || "Files.ReadWrite.AppFolder User.Read"
		this.redirectUri = config.redirectUri || (typeof window !== "undefined" ? window.location.origin + window.location.pathname : "")
		this.fetchImpl = customFetch || ((...args) => globalThis.fetch(...args))
		this.restoreSession()
	}

	private restoreSession(): void {
		if (typeof window === "undefined" || !window.localStorage) return
		try {
			const stored = localStorage.getItem(SESSION_STORAGE_KEY)
			if (stored) {
				const session = JSON.parse(stored)
				if (session.accessToken && session.currentUser && session.expiresAt > Date.now()) {
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

		// Use MSAL.js if loaded on window, otherwise fall back to OAuth implicit popup/token flow
		if (typeof window !== "undefined" && (window as any).msal) {
			const msalConfig = {
				auth: {
					clientId: this.config.clientId,
					redirectUri: this.redirectUri,
				},
			}
			const msalInstance = new (window as any).msal.PublicClientApplication(msalConfig)
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

		// Popup implicit OAuth flow for Microsoft Graph
		if (typeof window !== "undefined") {
			const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
				this.config.clientId
			)}&response_type=token&redirect_uri=${encodeURIComponent(
				this.redirectUri
			)}&scope=${encodeURIComponent(this.scope)}`

			const token = await new Promise<string>((resolve, reject) => {
				const popup = window.open(authUrl, "onedrive_login", "width=500,height=600")
				if (!popup) {
					reject(new Error("Failed to open login popup. Please allow popups for this site."))
					return
				}

				const timer = setInterval(() => {
					try {
						if (!popup || popup.closed) {
							clearInterval(timer)
							reject(new Error("Login popup was closed"))
							return
						}
						const hash = popup.location.hash
						if (hash && hash.includes("access_token=")) {
							const params = new URLSearchParams(hash.replace(/^#/, ""))
							const accessToken = params.get("access_token")
							if (accessToken) {
								clearInterval(timer)
								popup.close()
								resolve(accessToken)
							}
						}
					} catch {
						// Ignore cross-origin errors while user navigates on login.microsoftonline.com
					}
				}, 500)
			})

			this.accessToken = token
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
		const url = "https://graph.microsoft.com/v1.0/me/drive/special/approot/children"
		const res = await this.fetchImpl(url, {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!res.ok) {
			throw await this.extractError(res, "Failed to list files from OneDrive AppFolder")
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
		const url = `https://graph.microsoft.com/v1.0/me/drive/special/approot:/${encodedName}:/content`

		const res = await this.fetchImpl(url, {
			method: "PUT",
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				"Content-Type": "text/plain; charset=utf-8",
			},
			body: content,
		})

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
