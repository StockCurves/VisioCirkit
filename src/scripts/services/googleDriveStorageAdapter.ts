import { CloudFile, CloudUser, IStorageAdapter } from "./storageAdapter"

export interface GoogleDriveConfig {
	clientId: string
	scope?: string
}

const SESSION_STORAGE_KEY = "visiocirkit_gdrive_session"

export class GoogleDriveStorageAdapter implements IStorageAdapter {
	public readonly providerId = "google-drive"
	public readonly providerName = "Google Drive"

	private accessToken: string | null = null
	private currentUser: CloudUser | null = null
	private appFolderId: string | null = null
	private fetchImpl: typeof fetch

	private readonly scope: string

	public constructor(
		private readonly config: GoogleDriveConfig,
		customFetch?: typeof fetch
	) {
		this.scope = config.scope || "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email"
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

		// Check if Google Identity Services SDK is available on window
		if (typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
			const token = await new Promise<string>((resolve, reject) => {
				const client = (window as any).google.accounts.oauth2.initTokenClient({
					client_id: this.config.clientId,
					scope: this.scope,
					callback: (response: any) => {
						if (response.error) {
							reject(new Error(`Google OAuth error: ${response.error}`))
						} else {
							resolve(response.access_token)
						}
					},
				})
				client.requestAccessToken()
			})
			this.accessToken = token
			this.currentUser = await this.fetchUserProfile()
			this.saveSession()
			return this.currentUser
		}

		throw new Error("Google Identity Services SDK not loaded or environment unsupported")
	}

	public async logout(): Promise<void> {
		if (this.accessToken && typeof window !== "undefined" && (window as any).google?.accounts?.oauth2) {
			try {
				(window as any).google.accounts.oauth2.revoke(this.accessToken)
			} catch {
				// Ignore revocation errors
			}
		}
		this.accessToken = null
		this.currentUser = null
		this.appFolderId = null
		this.saveSession()
	}

	private async extractError(res: Response, fallback: string): Promise<Error> {
		try {
			const body = await res.json()
			if (body?.error?.message) {
				return new Error(`${fallback}: ${body.error.message}`)
			}
		} catch {
			// Ignore JSON parsing errors
		}
		return new Error(`${fallback}: HTTP ${res.status} ${res.statusText}`)
	}

	public async fetchUserProfile(): Promise<CloudUser> {
		this.ensureAuthenticated()
		const response = await this.fetchImpl("https://www.googleapis.com/oauth2/v3/userinfo", {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!response.ok) {
			throw await this.extractError(response, "Failed to fetch Google user profile")
		}

		const data = await response.json()
		const user: CloudUser = {
			id: data.sub,
			name: data.name || data.email,
			email: data.email,
			avatarUrl: data.picture,
		}
		this.currentUser = user
		return user
	}

	public async getOrCreateAppFolder(): Promise<string> {
		if (this.appFolderId) {
			return this.appFolderId
		}

		this.ensureAuthenticated()
		const folderName = "VisioCirkit"
		const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`
		const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`

		const listRes = await this.fetchImpl(listUrl, {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!listRes.ok) {
			throw await this.extractError(listRes, "Failed to query Google Drive folder")
		}

		const listData = await listRes.json()
		if (listData.files && listData.files.length > 0) {
			this.appFolderId = listData.files[0].id
			return this.appFolderId
		}

		// Folder doesn't exist, create it
		const createRes = await this.fetchImpl("https://www.googleapis.com/drive/v3/files", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.accessToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				name: folderName,
				mimeType: "application/vnd.google-apps.folder",
			}),
		})

		if (!createRes.ok) {
			throw await this.extractError(createRes, "Failed to create Google Drive folder")
		}

		const createData = await createRes.json()
		this.appFolderId = createData.id
		return this.appFolderId
	}

	public async listFiles(): Promise<CloudFile[]> {
		this.ensureAuthenticated()
		const folderId = await this.getOrCreateAppFolder()
		const query = `'${folderId}' in parents and trashed=false`
		const fields = "files(id, name, mimeType, modifiedTime)"
		const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}`

		const res = await this.fetchImpl(url, {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!res.ok) {
			throw await this.extractError(res, "Failed to list files from Google Drive")
		}

		const data = await res.json()
		return (data.files || []).map((file: any) => ({
			id: file.id,
			name: file.name,
			mimeType: file.mimeType,
			updatedAt: file.modifiedTime ? new Date(file.modifiedTime).getTime() : Date.now(),
		}))
	}

	public async getFile(fileId: string): Promise<string> {
		this.ensureAuthenticated()
		const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
		const res = await this.fetchImpl(url, {
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!res.ok) {
			throw await this.extractError(res, `Failed to download file ${fileId} from Google Drive`)
		}

		return res.text()
	}

	public async saveFile(name: string, content: string, fileId?: string): Promise<CloudFile> {
		this.ensureAuthenticated()
		const folderId = await this.getOrCreateAppFolder()

		if (fileId) {
			// Update content of existing file
			const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
			const res = await this.fetchImpl(url, {
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${this.accessToken}`,
					"Content-Type": "text/plain; charset=utf-8",
				},
				body: content,
			})

			if (!res.ok) {
				throw await this.extractError(res, `Failed to update file ${fileId} in Google Drive`)
			}

			const data = await res.json()
			return {
				id: data.id || fileId,
				name,
				content,
				mimeType: data.mimeType || "text/plain",
				updatedAt: Date.now(),
			}
		} else {
			// Create new file with multipart upload
			const boundary = "-------314159265358979323846"
			const delimiter = `\r\n--${boundary}\r\n`
			const closeDelimiter = `\r\n--${boundary}--`

			const metadata = {
				name,
				parents: [folderId],
				mimeType: "text/plain",
			}

			const multipartRequestBody =
				delimiter +
				"Content-Type: application/json; charset=UTF-8\r\n\r\n" +
				JSON.stringify(metadata) +
				delimiter +
				"Content-Type: text/plain; charset=utf-8\r\n\r\n" +
				content +
				closeDelimiter

			const res = await this.fetchImpl(
				"https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
				{
					method: "POST",
					headers: {
						Authorization: `Bearer ${this.accessToken}`,
						"Content-Type": `multipart/related; boundary=${boundary}`,
					},
					body: multipartRequestBody,
				}
			)

			if (!res.ok) {
				throw await this.extractError(res, `Failed to create file ${name} in Google Drive`)
			}

			const data = await res.json()
			return {
				id: data.id,
				name,
				content,
				mimeType: data.mimeType || "text/plain",
				updatedAt: Date.now(),
			}
		}
	}

	public async deleteFile(fileId: string): Promise<void> {
		this.ensureAuthenticated()
		const url = `https://www.googleapis.com/drive/v3/files/${fileId}`
		const res = await this.fetchImpl(url, {
			method: "DELETE",
			headers: { Authorization: `Bearer ${this.accessToken}` },
		})

		if (!res.ok && res.status !== 404) {
			throw await this.extractError(res, `Failed to delete file ${fileId} from Google Drive`)
		}
	}

	private ensureAuthenticated(): void {
		if (!this.accessToken) {
			throw new Error("User is not authenticated with Google Drive")
		}
	}
}
