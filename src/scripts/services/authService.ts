export class AuthService {
	private static readonly GITHUB_AUTH_PATH = "/api/auth/github"

	public constructor(private readonly apiBase = "") {}

	public getAuthorizationUrl(apiBase = ""): string {
		const normalizedBase = apiBase.trim().replace(/\/+$/, "")
		return normalizedBase
			? `${normalizedBase}${AuthService.GITHUB_AUTH_PATH}`
			: AuthService.GITHUB_AUTH_PATH
	}

	public async getSession(): Promise<{ authenticated: boolean; user?: any }> {
		const response = await fetch(`${this.apiBase}/api/auth/session`, {
			credentials: "include",
			headers: {
				Accept: "application/json",
			},
		})

		if (response.status === 401) {
			return { authenticated: false }
		}
		if (!response.ok) {
			throw new Error(`Failed to fetch session: ${response.statusText}`)
		}

		return response.json()
	}

	public async logout(): Promise<void> {
		await fetch(`${this.apiBase}/api/auth/logout`, {
			method: "POST",
			credentials: "include",
		})
	}

	public async getUserProfile(): Promise<any> {
		const session = await this.getSession()
		if (!session.authenticated || !session.user) {
			throw new Error("No authenticated GitHub session found")
		}
		return session.user
	}
}
