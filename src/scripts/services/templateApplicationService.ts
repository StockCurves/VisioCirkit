import {
	TemplateDataSource,
	TemplateDirectory,
	TemplateEditorPort,
	TemplateListViewModel,
	TemplateNotifierPort,
	TemplateSessionState,
	WorkTreeFileNode,
	WorkTreeFolderNode,
	WorkTreeNode,
} from "./templateTypes"

const DEFAULT_TEMPLATE_DIR: TemplateDirectory = "work"
const DEFAULT_TEMPLATE_NAME = "blank.tex"

export function buildWorkTree(works: string[]): { workTree: WorkTreeNode[]; folders: string[] } {
	const rootChildren: WorkTreeNode[] = []
	const folderMap = new Map<string, WorkTreeFolderNode>()
	const foldersSet = new Set<string>()

	for (const path of works) {
		const parts = path.split("/").filter(Boolean)
		if (parts.length === 1) {
			rootChildren.push({
				type: "file",
				name: parts[0],
				path: path,
			})
		} else {
			let currentFolderPath = ""
			let currentParentChildren = rootChildren

			for (let i = 0; i < parts.length - 1; i++) {
				const folderName = parts[i]
				currentFolderPath = currentFolderPath ? `${currentFolderPath}/${folderName}` : folderName
				foldersSet.add(currentFolderPath)

				let folderNode = folderMap.get(currentFolderPath)
				if (!folderNode) {
					folderNode = {
						type: "folder",
						name: folderName,
						path: currentFolderPath,
						children: [],
					}
					folderMap.set(currentFolderPath, folderNode)
					currentParentChildren.push(folderNode)
				}
				currentParentChildren = folderNode.children
			}

			const fileName = parts[parts.length - 1]
			currentParentChildren.push({
				type: "file",
				name: fileName,
				path: path,
			})
		}
	}

	const sortNodes = (nodes: WorkTreeNode[]): WorkTreeNode[] => {
		nodes.sort((a, b) => {
			if (a.type !== b.type) {
				return a.type === "folder" ? -1 : 1
			}
			return a.name.localeCompare(b.name)
		})
		for (const node of nodes) {
			if (node.type === "folder") {
				sortNodes(node.children)
			}
		}
		return nodes
	}

	return {
		workTree: sortNodes(rootChildren),
		folders: Array.from(foldersSet).sort((a, b) => a.localeCompare(b)),
	}
}

export class TemplateApplicationService {
	private state: TemplateSessionState = {
		currentDir: DEFAULT_TEMPLATE_DIR,
		currentName: DEFAULT_TEMPLATE_NAME,
		templates: [],
		works: [],
	}

	public constructor(
		private readonly dataSource: TemplateDataSource,
		private readonly editor: TemplateEditorPort,
		private readonly notifier: TemplateNotifierPort
	) {}

	public getState(): TemplateSessionState {
		return {
			currentDir: this.state.currentDir,
			currentName: this.state.currentName,
			templates: [...this.state.templates],
			works: [...this.state.works],
		}
	}

	public async listEntries(): Promise<TemplateListViewModel> {
		const files = await this.dataSource.listFiles()
		let works = files.works ?? []
		if (!works.includes("blank.tex")) {
			works = ["blank.tex", ...works]
			const blankContent = `\\begin{circuitikz}[american]\n\\end{circuitikz}`
			this.dataSource.saveWork("blank.tex", blankContent).catch(() => {})
		}
		this.state = {
			...this.state,
			templates: files.templates ?? [],
			works: works,
		}
		return this.buildListViewModel()
	}

	public async openFile(dir: TemplateDirectory, name: string): Promise<TemplateListViewModel> {
		try {
			let code: string
			try {
				code = await this.dataSource.readFile(dir, name)
			} catch (err: any) {
				if (dir === "work" && name === "blank.tex") {
					const blankContent = `\\begin{circuitikz}[american]\n\\end{circuitikz}`
					this.dataSource.saveWork("blank.tex", blankContent).catch(() => {})
					code = blankContent
				} else {
					throw err
				}
			}
			this.editor.setCode(code)
			this.editor.applyEditorText()
			this.state = {
				...this.state,
				currentDir: dir,
				currentName: name,
			}
			return this.buildListViewModel()
		} catch (err: any) {
			await this.notifier.alert("Error loading file", err.message)
			throw err
		}
	}

	public async saveWork(name: string): Promise<TemplateListViewModel> {
		const cleanPath = name.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
		if (!cleanPath) {
			await this.notifier.alert("Save File", "Please enter a filename.")
			return this.buildListViewModel()
		}

		const segments = cleanPath.split("/").map((s) => s.trim()).filter(Boolean)
		if (segments.length === 0) {
			await this.notifier.alert("Save File", "Please enter a valid filename.")
			return this.buildListViewModel()
		}

		for (const seg of segments) {
			if (/[\0-\x1F\x7F]/.test(seg)) {
				await this.notifier.alert("Save File", "Invalid filename characters.")
				return this.buildListViewModel()
			}
		}

		const normalizedPath = segments.join("/")
		const safeFilename = normalizedPath.endsWith(".tex") ? normalizedPath : `${normalizedPath}.tex`
		const content = this.editor.getCode()

		try {
			await this.dataSource.saveWork(safeFilename, content)
			this.state = {
				...this.state,
				currentDir: "work",
				currentName: safeFilename,
			}
			await this.listEntries()
			await this.notifier.alert("Save Complete", `Successfully saved to work/${safeFilename}`)
			return await this.openFile("work", safeFilename)
		} catch (err: any) {
			await this.notifier.alert("Save Error", err.message)
			throw err
		}
	}

	public async deleteWork(name: string): Promise<TemplateListViewModel> {
		if (name === "blank.tex") {
			await this.notifier.alert("Delete Work", "The default blank work cannot be deleted.")
			return this.buildListViewModel()
		}
		const baseName = name.replace(/\.tex$/, "")
		const confirmDelete = await this.notifier.confirm("Delete Work", `Are you sure you want to delete "${baseName}"?`)
		if (!confirmDelete) {
			return this.buildListViewModel()
		}

		try {
			await this.dataSource.deleteWork(name)
			const deletedCurrent = this.state.currentDir === "work" && this.state.currentName === name
			await this.listEntries()
			if (deletedCurrent) {
				await this.openFile(DEFAULT_TEMPLATE_DIR, DEFAULT_TEMPLATE_NAME)
			}
			await this.notifier.alert("Delete Complete", `Successfully deleted ${baseName}`)
			return this.buildListViewModel()
		} catch (err: any) {
			await this.notifier.alert("Delete Error", err.message)
			throw err
		}
	}

	public async bootstrapDefaultFile(shouldLoadDefault = !window.location.search.includes("base=")): Promise<TemplateListViewModel> {
		await this.listEntries()
		if (shouldLoadDefault) {
			await this.openFile(DEFAULT_TEMPLATE_DIR, DEFAULT_TEMPLATE_NAME)
		}
		return this.buildListViewModel()
	}

	private buildListViewModel(): TemplateListViewModel {
		const { workTree, folders } = buildWorkTree(this.state.works)
		return {
			templates: [...this.state.templates],
			works: [...this.state.works],
			workTree,
			folders,
			selectedDisplayName: this.state.currentName.replace(/\.tex$/, ""),
			hasWorks: this.state.works.length > 0,
		}
	}
}
