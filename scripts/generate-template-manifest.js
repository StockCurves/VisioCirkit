const fs = require("fs")
const path = require("path")

const root = path.resolve(__dirname, "..")
const sourceDir = path.join(root, "template")
const outputDir = path.join(root, "src", "data", "templates")
const manifestPath = path.join(root, "src", "scripts", "services", "generatedTemplateManifest.ts")

const names = fs
	.readdirSync(sourceDir)
	.filter((name) => name.endsWith(".tex"))
	.sort((a, b) => a.localeCompare(b))

fs.mkdirSync(outputDir, { recursive: true })

for (const name of names) {
	fs.copyFileSync(path.join(sourceDir, name), path.join(outputDir, name))
}

const entries = names
	.map((name) => {
		return `\t{ name: ${JSON.stringify(name)}, url: new URL("../../data/templates/${name}", import.meta.url).toString() },`
	})
	.join("\n")

fs.writeFileSync(
	manifestPath,
	`export interface StaticTemplateManifestEntry {\n\tname: string\n\turl: string\n}\n\nexport const staticTemplateManifest: StaticTemplateManifestEntry[] = [\n${entries}\n]\n`,
	"utf8"
)
