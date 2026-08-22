export interface CloudUser {
	id: string
	name: string
	email: string
	avatarUrl?: string
}

export interface CloudFile {
	id: string
	name: string
	content?: string
	mimeType: string
	updatedAt: number
}

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "error"

export interface IStorageAdapter {
	readonly providerId: string
	readonly providerName: string

	/**
	 * Initiate user login flow
	 */
	login(): Promise<CloudUser>

	/**
	 * Initiate user logout flow
	 */
	logout(): Promise<void>

	/**
	 * Get current logged in user (if active token exists)
	 */
	getUser(): CloudUser | null

	/**
	 * Check if user is currently authenticated
	 */
	isAuthenticated(): boolean

	/**
	 * List all files in the app storage location
	 */
	listFiles(): Promise<CloudFile[]>

	/**
	 * Get content of a specific file by ID
	 */
	getFile(fileId: string): Promise<string>

	/**
	 * Upload or update a file in the app storage location
	 */
	saveFile(name: string, content: string, fileId?: string): Promise<CloudFile>

	/**
	 * Delete a file by ID
	 */
	deleteFile(fileId: string): Promise<void>
}
