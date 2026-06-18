const https = require("https")

module.exports = function handler(req, res) {
	if (req.method === "OPTIONS") {
		res.setHeader("Access-Control-Allow-Origin", "*")
		res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
		res.setHeader("Access-Control-Allow-Headers", "Content-Type")
		res.status(204).end()
		return
	}

	if (req.method !== "POST") {
		res.status(405).send("Method not allowed")
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

		const proxyReq = https.request(options, (proxyRes) => {
			let data = ""
			proxyRes.on("data", (chunk) => {
				data += chunk
			})
			proxyRes.on("end", () => {
				res.setHeader("Content-Type", "text/plain; charset=utf-8")
				res.setHeader("Access-Control-Allow-Origin", "*")
				res.status(proxyRes.statusCode || 200).send(data)
			})
		})

		proxyReq.on("error", (err) => {
			res.status(502).send("Proxy error: " + err.message)
		})

		proxyReq.write(body)
		proxyReq.end()
	})
}
