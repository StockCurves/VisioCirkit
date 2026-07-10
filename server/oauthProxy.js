const https = require("https")
const url = require("url")

function handleGithubAuthRequest(req, res) {
  const clientId = process.env.GITHUB_CLIENT_ID || ""
  const redirectUri = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`
  res.writeHead(302, { Location: redirectUri })
  res.end()
}

function handleGithubCallbackRequest(req, res, transport = https) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(req.url, true)
    const code = parsedUrl.query.code

    if (!code) {
      res.writeHead(400, { "Content-Type": "text/plain" })
      res.end("Missing code parameter")
      resolve()
      return
    }

    const clientId = process.env.GITHUB_CLIENT_ID || ""
    const clientSecret = process.env.GITHUB_CLIENT_SECRET || ""

    const postData = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: code,
    })

    const options = {
      hostname: "github.com",
      path: "/login/oauth/access_token",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(postData),
        "User-Agent": "VisioCirkit-OAuth-Proxy/1.0",
      },
    }

    const proxyReq = transport.request(options, (proxyRes) => {
      let data = ""
      proxyRes.on("data", (chunk) => {
        data += chunk
      })
      proxyRes.on("end", () => {
        try {
          const parsed = JSON.parse(data)
          const token = parsed.access_token
          if (token) {
            res.writeHead(302, { Location: `/?token=${token}` })
            res.end()
          } else {
            res.writeHead(500, { "Content-Type": "text/plain" })
            res.end("Failed to exchange code: " + (parsed.error_description || "No token returned"))
          }
        } catch (e) {
          res.writeHead(500, { "Content-Type": "text/plain" })
          res.end("Invalid JSON response from GitHub")
        }
        resolve()
      })
    })

    proxyReq.on("error", (err) => {
      console.error("[oauth-proxy] GitHub error:", err.message)
      res.writeHead(502, { "Content-Type": "text/plain" })
      res.end("OAuth proxy error: " + err.message)
      reject(err)
    })

    proxyReq.write(postData)
    proxyReq.end()
  })
}

module.exports = {
  handleGithubAuthRequest,
  handleGithubCallbackRequest,
}
