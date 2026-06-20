const https = require("https")

function handleLatexProxyRequest(req, res, transport = https) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    })
    res.end()
    return
  }

  if (req.method !== "POST") {
    res.writeHead(405, {
      "Content-Type": "text/plain; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    })
    res.end("Method Not Allowed")
    return
  }

  let body = ""
  req.on("data", (chunk) => {
    body += chunk
  })
  req.on("end", () => {
    const options = {
      hostname: "quicklatex.com",
      path: "/latex3.f",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        "User-Agent": "VisioCirkit-Proxy/1.0",
        Referer: "https://quicklatex.com/",
      },
    }

    const proxyReq = transport.request(options, (proxyRes) => {
      let data = ""
      proxyRes.on("data", (chunk) => {
        data += chunk
      })
      proxyRes.on("end", () => {
        res.writeHead(proxyRes.statusCode, {
          "Content-Type": "text/plain; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
        })
        res.end(data)
      })
    })

    proxyReq.on("error", (err) => {
      console.error("[proxy] QuickLaTeX error:", err.message)
      res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" })
      res.end("Proxy error: " + err.message)
    })

    proxyReq.write(body)
    proxyReq.end()
  })
}

module.exports = {
  handleLatexProxyRequest,
}
