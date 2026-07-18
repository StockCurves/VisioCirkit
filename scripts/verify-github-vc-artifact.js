const fs = require("fs")
const path = require("path")

const distIndexFile = path.resolve(__dirname, "..", "dist", "index.html")
const runtimeMetaPattern = /<meta\s+name="circuitikz-runtime"\s+content="github-vc"\s*\/?>/

if (!fs.existsSync(distIndexFile)) {
	console.error("[verify-github-vc-artifact] missing dist/index.html. Run npm run build:github-vc first.")
	process.exit(1)
}

const html = fs.readFileSync(distIndexFile, "utf8")
if (!runtimeMetaPattern.test(html)) {
	console.error("[verify-github-vc-artifact] dist/index.html is not pinned to the github-vc runtime preset.")
	process.exit(1)
}

console.log("[verify-github-vc-artifact] Verified dist/index.html uses the github-vc runtime preset.")
