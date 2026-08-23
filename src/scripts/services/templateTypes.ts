export type TemplateDirectory = "template" | "work"

export interface TemplateSessionState {
	currentDir: TemplateDirectory
	currentName: string
	templates: string[]
	works: string[]
}

export interface WorkTreeFileNode {
	type: "file"
	name: string
	path: string
}

export interface WorkTreeFolderNode {
	type: "folder"
	name: string
	path: string
	children: WorkTreeNode[]
}

export type WorkTreeNode = WorkTreeFileNode | WorkTreeFolderNode

export interface TemplateListViewModel {
	templates: string[]
	works: string[]
	workTree: WorkTreeNode[]
	folders: string[]
	selectedDisplayName: string
	hasWorks: boolean
}

export interface TemplateDataSource {
	listFiles(): Promise<{ templates: string[]; works: string[] }>
	readFile(dir: TemplateDirectory, name: string): Promise<string>
	saveWork(name: string, content: string): Promise<void>
	deleteWork(name: string): Promise<void>
}

export interface TemplateEditorPort {
	getCode(): string
	setCode(code: string): void
	applyEditorText(): void
}

export interface TemplateNotifierPort {
	alert(title: string, message: string): Promise<void>
	confirm(title: string, message: string): Promise<boolean>
}
