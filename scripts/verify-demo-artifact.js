const fs = require("fs")
const path = require("path")

const distIndexPath = path.resolve(__dirname, "..", "dist", "index.html")
const runtimeMetaPattern = /<meta\s+name="circuitikz-runtime"\s+content="demo"\s*\/?>/

if (!fs.existsSync(distIndexPath)) {
	console.error(`[verify-demo-artifact] Missing build artifact: ${distIndexPath}`)
	process.exit(1)
}

const html = fs.readFileSync(distIndexPath, "utf8")

if (!runtimeMetaPattern.test(html)) {
	console.error("[verify-demo-artifact] dist/index.html is not pinned to the demo runtime preset.")
	process.exit(1)
}

console.log("[verify-demo-artifact] Verified dist/index.html uses the demo runtime preset.")
