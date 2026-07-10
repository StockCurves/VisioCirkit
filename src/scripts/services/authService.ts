export class AuthService {
	private static readonly TOKEN_KEY = "git_oauth_token"

	public saveToken(token: string): void {
		localStorage.setItem(AuthService.TOKEN_KEY, token)
	}

	public getToken(): string | null {
		return localStorage.getItem(AuthService.TOKEN_KEY)
	}

	public clearToken(): void {
		localStorage.removeItem(AuthService.TOKEN_KEY)
	}

	public async getUserProfile(): Promise<any> {
		const token = this.getToken()
		if (!token) {
			throw new Error("No access token found")
		}

		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github+json",
			},
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch profile: ${response.statusText}`)
		}

		return response.json()
	}
}
