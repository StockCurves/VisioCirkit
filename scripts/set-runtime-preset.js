const fs = require("fs")
const path = require("path")

const projectRoot = path.resolve(__dirname, "..")
const distIndexFile = path.join(projectRoot, "dist", "index.html")
const preset = process.argv[2]
const supportedPresets = new Set(["server", "demo"])

if (!supportedPresets.has(preset)) {
	console.error(`[runtime-preset] expected one of: ${Array.from(supportedPresets).join(", ")}`)
	process.exit(1)
}

if (!fs.existsSync(distIndexFile)) {
	console.error(`[runtime-preset] missing build output: ${path.relative(projectRoot, distIndexFile)}`)
	process.exit(1)
}

const html = fs.readFileSync(distIndexFile, "utf8")
const runtimeMetaPattern = /<meta\s+name="circuitikz-runtime"\s+content="[^"]*"\s*\/?>/
const runtimeMetaTag = `<meta name="circuitikz-runtime" content="${preset}" />`

if (!runtimeMetaPattern.test(html)) {
	console.error("[runtime-preset] could not find runtime meta tag in dist/index.html")
	process.exit(1)
}

fs.writeFileSync(distIndexFile, html.replace(runtimeMetaPattern, runtimeMetaTag), "utf8")
console.log(`[runtime-preset] set dist/index.html runtime preset to "${preset}"`)
