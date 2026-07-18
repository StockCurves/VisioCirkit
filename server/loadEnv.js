const fs = require("fs")
const path = require("path")

let loaded = false

function parseEnvFile(filePath) {
	const content = fs.readFileSync(filePath, "utf8")
	for (const rawLine of content.split(/\r?\n/)) {
		const line = rawLine.trim()
		if (!line || line.startsWith("#")) {
			continue
		}

		const separatorIndex = line.indexOf("=")
		if (separatorIndex === -1) {
			continue
		}

		const key = line.slice(0, separatorIndex).trim()
		if (!key || process.env[key] !== undefined) {
			continue
		}

		let value = line.slice(separatorIndex + 1).trim()
		if (
			(value.startsWith("\"") && value.endsWith("\"")) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1)
		}

		process.env[key] = value
	}
}

function loadEnv() {
	if (loaded) {
		return
	}
	loaded = true

	const rootDir = path.resolve(__dirname, "..")
	const candidates = [".env.local", ".env"]

	for (const name of candidates) {
		const filePath = path.join(rootDir, name)
		if (!fs.existsSync(filePath)) {
			continue
		}
		if (typeof process.loadEnvFile === "function") {
			process.loadEnvFile(filePath)
			continue
		}
		parseEnvFile(filePath)
	}
}

module.exports = { loadEnv }
