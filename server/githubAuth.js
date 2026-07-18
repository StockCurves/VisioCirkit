const crypto = require("crypto")
const https = require("https")
const { URL } = require("url")
const { loadEnv } = require("./loadEnv")

loadEnv()

const STATE_COOKIE = "visiocirkit_oauth_state"
const SESSION_COOKIE = "visiocirkit_session"
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7

function parseCookies(req) {
	const header = req.headers?.cookie || ""
	return Object.fromEntries(
		header
			.split(";")
			.map((part) => part.trim())
			.filter(Boolean)
			.map((part) => {
				const index = part.indexOf("=")
				if (index === -1) return [part, ""]
				return [
					decodeURIComponent(part.slice(0, index)),
					decodeURIComponent(part.slice(index + 1)),
				]
			})
	)
}

function appendSetCookie(res, cookie) {
	const existing = res.getHeader?.("Set-Cookie")
	if (!existing) {
		res.setHeader("Set-Cookie", cookie)
		return
	}
	res.setHeader("Set-Cookie", Array.isArray(existing) ? [...existing, cookie] : [existing, cookie])
}

function serializeCookie(name, value, options = {}) {
	const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Lax"]
	if (options.maxAge !== undefined) parts.push(`Max-Age=${options.maxAge}`)
	if (options.secure !== false) parts.push("Secure")
	return parts.join("; ")
}

function clearCookie(name, secure = true) {
	return serializeCookie(name, "", { maxAge: 0, secure })
}

function getBaseUrl(req) {
	if (process.env.APP_BASE_URL) {
		return process.env.APP_BASE_URL.replace(/\/+$/, "")
	}
	const proto = req.headers?.["x-forwarded-proto"] || "http"
	const host = req.headers?.["x-forwarded-host"] || req.headers?.host || "localhost:3001"
	return `${proto}://${host}`
}

function getCookieSecret() {
	const secret = process.env.AUTH_COOKIE_SECRET || process.env.GITHUB_CLIENT_SECRET
	if (!secret) {
		throw new Error("Missing AUTH_COOKIE_SECRET")
	}
	return crypto.createHash("sha256").update(secret).digest()
}

function encryptSession(payload) {
	const iv = crypto.randomBytes(12)
	const cipher = crypto.createCipheriv("aes-256-gcm", getCookieSecret(), iv)
	const ciphertext = Buffer.concat([
		cipher.update(JSON.stringify(payload), "utf8"),
		cipher.final(),
	])
	return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url")
}

function decryptSession(value) {
	const raw = Buffer.from(value, "base64url")
	const iv = raw.subarray(0, 12)
	const authTag = raw.subarray(12, 28)
	const ciphertext = raw.subarray(28)
	const decipher = crypto.createDecipheriv("aes-256-gcm", getCookieSecret(), iv)
	decipher.setAuthTag(authTag)
	const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8")
	return JSON.parse(plaintext)
}

function requestJson(options, body, transport = https) {
	return new Promise((resolve, reject) => {
		const req = transport.request(options, (res) => {
			let data = ""
			res.on("data", (chunk) => {
				data += chunk
			})
			res.on("end", () => {
				let parsed = null
				try {
					parsed = data ? JSON.parse(data) : null
				} catch (error) {
					reject(new Error("Invalid JSON response"))
					return
				}
				resolve({ statusCode: res.statusCode || 500, headers: res.headers || {}, data: parsed })
			})
		})
		req.on("error", reject)
		if (body) req.write(body)
		req.end()
	})
}

async function exchangeCodeForToken(code, redirectUri, transport) {
	const payload = JSON.stringify({
		client_id: process.env.GITHUB_CLIENT_ID || "",
		client_secret: process.env.GITHUB_CLIENT_SECRET || "",
		code,
		redirect_uri: redirectUri,
	})

	const response = await requestJson({
		hostname: "github.com",
		path: "/login/oauth/access_token",
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
			"Content-Length": Buffer.byteLength(payload),
			"User-Agent": "VisioCirkit-OAuth/1.0",
		},
	}, payload, transport)

	if (!response.data?.access_token) {
		throw new Error(response.data?.error_description || "No access token returned")
	}
	return response.data.access_token
}

function getSession(req) {
	const cookie = parseCookies(req)[SESSION_COOKIE]
	if (!cookie) return null
	try {
		const session = decryptSession(cookie)
		if (!session.accessToken) return null
		return session
	} catch (error) {
		return null
	}
}

function writeJson(res, statusCode, data) {
	res.writeHead(statusCode, { "Content-Type": "application/json" })
	res.end(JSON.stringify(data))
}

function handleGithubAuthRequest(req, res) {
	const clientId = process.env.GITHUB_CLIENT_ID || ""
	if (!clientId) {
		writeJson(res, 500, { error: "Missing GITHUB_CLIENT_ID" })
		return
	}

	const state = crypto.randomBytes(24).toString("base64url")
	const baseUrl = getBaseUrl(req)
	const secureCookie = baseUrl.startsWith("https://")
	const redirectUri = `${baseUrl}/api/auth/github/callback`
	const authorizeUrl = new URL("https://github.com/login/oauth/authorize")
	authorizeUrl.searchParams.set("client_id", clientId)
	authorizeUrl.searchParams.set("redirect_uri", redirectUri)
	authorizeUrl.searchParams.set("scope", "repo")
	authorizeUrl.searchParams.set("state", state)

	appendSetCookie(res, serializeCookie(STATE_COOKIE, state, { maxAge: 600, secure: secureCookie }))
	res.writeHead(302, { Location: authorizeUrl.toString() })
	res.end()
}

async function handleGithubCallbackRequest(req, res, transport = https) {
	try {
		const parsedUrl = new URL(req.url, getBaseUrl(req))
		const code = parsedUrl.searchParams.get("code")
		const state = parsedUrl.searchParams.get("state")
		const expectedState = parseCookies(req)[STATE_COOKIE]

		if (!code || !state || !expectedState || state !== expectedState) {
			writeJson(res, 400, { error: "Invalid GitHub OAuth callback" })
			return
		}

		const baseUrl = getBaseUrl(req)
		const secureCookie = baseUrl.startsWith("https://")
		const redirectUri = `${baseUrl}/api/auth/github/callback`
		const accessToken = await exchangeCodeForToken(code, redirectUri, transport)
		const sessionCookie = encryptSession({ accessToken, createdAt: Date.now() })

		appendSetCookie(res, clearCookie(STATE_COOKIE, secureCookie))
		appendSetCookie(res, serializeCookie(SESSION_COOKIE, sessionCookie, { maxAge: COOKIE_MAX_AGE, secure: secureCookie }))
		res.writeHead(302, { Location: "/" })
		res.end()
	} catch (error) {
		writeJson(res, 500, { error: error.message || "GitHub OAuth callback failed" })
	}
}

async function handleSessionRequest(req, res, transport = https) {
	const session = getSession(req)
	if (!session) {
		writeJson(res, 401, { authenticated: false })
		return
	}

	const profile = await requestJson({
		hostname: "api.github.com",
		path: "/user",
		method: "GET",
		headers: {
			Authorization: `Bearer ${session.accessToken}`,
			Accept: "application/vnd.github+json",
			"User-Agent": "VisioCirkit-OAuth/1.0",
		},
	}, null, transport)

	if (profile.statusCode >= 400) {
		appendSetCookie(res, clearCookie(SESSION_COOKIE))
		writeJson(res, 401, { authenticated: false })
		return
	}

	writeJson(res, 200, { authenticated: true, user: profile.data })
}

function handleLogoutRequest(req, res) {
	appendSetCookie(res, clearCookie(SESSION_COOKIE, getBaseUrl(req).startsWith("https://")))
	writeJson(res, 200, { ok: true })
}

async function handleGithubProxyRequest(req, res, transport = https) {
	const session = getSession(req)
	if (!session) {
		writeJson(res, 401, { error: "Not authenticated" })
		return
	}

	const basePath = "/api/github"
	const originalUrl = new URL(req.url, getBaseUrl(req))
	const githubPath = originalUrl.pathname.startsWith(basePath)
		? originalUrl.pathname.slice(basePath.length) || "/"
		: "/"
	const targetPath = `${githubPath}${originalUrl.search}`

	const chunks = []
	req.on("data", (chunk) => chunks.push(chunk))
	req.on("end", async () => {
		try {
			const body = chunks.length ? Buffer.concat(chunks) : null
			const response = await requestJson({
				hostname: "api.github.com",
				path: targetPath,
				method: req.method || "GET",
				headers: {
					Authorization: `Bearer ${session.accessToken}`,
					Accept: "application/vnd.github+json",
					"Content-Type": req.headers?.["content-type"] || "application/json",
					"Content-Length": body ? body.length : 0,
					"User-Agent": "VisioCirkit-GitHub-Proxy/1.0",
				},
			}, body, transport)
			writeJson(res, response.statusCode, response.data)
		} catch (error) {
			writeJson(res, 502, { error: error.message || "GitHub proxy request failed" })
		}
	})
}

module.exports = {
	handleGithubAuthRequest,
	handleGithubCallbackRequest,
	handleGithubProxyRequest,
	handleLogoutRequest,
	handleSessionRequest,
	getSession,
}
