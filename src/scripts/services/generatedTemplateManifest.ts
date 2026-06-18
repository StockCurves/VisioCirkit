export interface StaticTemplateManifestEntry {
	name: string
	url: string
}

export const staticTemplateManifest: StaticTemplateManifestEntry[] = [
	{ name: "bridge-rectifier.tex", url: new URL("../../data/templates/bridge-rectifier.tex", import.meta.url).toString() },
	{ name: "opamp-amp.tex", url: new URL("../../data/templates/opamp-amp.tex", import.meta.url).toString() },
	{ name: "rc-lowpass.tex", url: new URL("../../data/templates/rc-lowpass.tex", import.meta.url).toString() },
	{ name: "sallen-key.tex", url: new URL("../../data/templates/sallen-key.tex", import.meta.url).toString() },
	{ name: "user-complex.tex", url: new URL("../../data/templates/user-complex.tex", import.meta.url).toString() },
]
