import { Modal } from "bootstrap"
import { MainController } from "./mainController"
import { TikzEditorController } from "./tikzEditorController"
import { createTemplateControllerRuntime } from "../services/controllerRuntime"
import { TemplateDirectory, TemplateListViewModel, WorkTreeNode } from "../services/templateTypes"
import { CanvasController, LiveRenderController } from "../internal"

export class TemplateController {
	private static _instance: TemplateController
	public static get instance(): TemplateController {
		if (!TemplateController._instance) {
			TemplateController._instance = new TemplateController()
		}
		return TemplateController._instance
	}

	private templateDropdownBtn: HTMLButtonElement | null = null
	private templateDropdownMenu: HTMLUListElement | null = null
	private saveServerModal: Modal | null = null
	private saveServerFolderSelect: HTMLSelectElement | null = null
	private saveServerNewFolderBtn: HTMLButtonElement | null = null
	private saveServerFilenameInput: HTMLInputElement
	private saveServerConfirmButton: HTMLButtonElement
	private workContextMenu: HTMLDivElement | null = null
	private deleteWorkButton: HTMLButtonElement | null = null
	private newSubfolderButton: HTMLButtonElement | null = null
	private contextMenuTargetFile: string | null = null
	private contextMenuTargetFolder: string | null = null
	private collapsedFolders: Set<string> = new Set<string>()
	private lastViewModel: TemplateListViewModel | null = null

	private readonly runtime = createTemplateControllerRuntime(
		{
			getCode: () => TikzEditorController.instance.getCode(),
			setCode: (code) => TikzEditorController.instance.setCode(code),
			applyEditorText: () => TikzEditorController.instance.applyEditorText(),
		},
		{
			alert: (title, message) => MainController.instance.openAlert(title, message),
			confirm: (title, message) => MainController.instance.openConfirm(title, message),
		}
	)

	private constructor() {
		this.templateDropdownBtn = document.getElementById("template-dropdown-btn") as HTMLButtonElement
		this.templateDropdownMenu = document.getElementById("template-dropdown-menu") as HTMLUListElement
		this.saveServerFolderSelect = document.getElementById("saveServerFolderSelect") as HTMLSelectElement
		this.saveServerNewFolderBtn = document.getElementById("saveServerNewFolderBtn") as HTMLButtonElement
		this.saveServerFilenameInput = document.getElementById("saveServerFilenameInput") as HTMLInputElement
		this.saveServerConfirmButton = document.getElementById("saveServerConfirmButton") as HTMLButtonElement
		this.workContextMenu = document.getElementById("workContextMenu") as HTMLDivElement
		this.deleteWorkButton = document.getElementById("deleteWorkButton") as HTMLButtonElement
		this.newSubfolderButton = document.getElementById("newSubfolderButton") as HTMLButtonElement

		const modalEl = document.getElementById("saveServerModal")
		if (modalEl) {
			this.saveServerModal = new Modal(modalEl)
		}

		this.initEvents()
	}

	public async initialize() {
		if (!this.templateDropdownMenu) return
		try {
			const viewModel = await this.runtime.applicationService.bootstrapDefaultFile()
			this.renderDropdown(viewModel)
		} catch (err) {
			console.error("Error loading templates:", err)
		}
	}

	public openSaveModal() {
		const currentState = this.runtime.applicationService.getState()
		const currentPath = currentState.currentName
		const pathParts = currentPath.split("/")
		const defaultFolder = pathParts.length > 1 ? pathParts.slice(0, -1).join("/") : ""
		const baseName = pathParts[pathParts.length - 1].replace(/\.tex$/, "")

		if (this.saveServerFolderSelect) {
			this.saveServerFolderSelect.innerHTML = `<option value="">/ (Root)</option>`
			if (this.lastViewModel && this.lastViewModel.folders) {
				for (const folder of this.lastViewModel.folders) {
					const opt = document.createElement("option")
					opt.value = folder
					opt.textContent = `/${folder}`
					if (folder === defaultFolder) {
						opt.selected = true
					}
					this.saveServerFolderSelect.appendChild(opt)
				}
			}
		}

		this.saveServerFilenameInput.value =
			baseName === "rc-lowpass" || baseName === "blank" ? "my-circuit" : baseName
		this.saveServerModal?.show()
	}

	private initEvents() {
		this.saveServerConfirmButton?.addEventListener("click", () => {
			this.confirmSaveToServer()
		})

		this.saveServerNewFolderBtn?.addEventListener("click", () => {
			const folderName = prompt("Enter new folder name:")
			if (!folderName) return
			const cleanFolder = folderName.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
			if (!cleanFolder || /[\0-\x1F\x7F]/.test(cleanFolder)) {
				alert("Invalid folder name")
				return
			}
			const currentFolder = (this.saveServerFolderSelect?.value || "").trim().replace(/^\/+|\/+$/g, "")
			const newPath = currentFolder ? `${currentFolder}/${cleanFolder}` : cleanFolder

			let opt = Array.from(this.saveServerFolderSelect?.options || []).find((o) => o.value === newPath)
			if (!opt) {
				opt = document.createElement("option")
				opt.value = newPath
				opt.textContent = `/${newPath}`
				this.saveServerFolderSelect?.appendChild(opt)
			}
			opt.selected = true
		})

		this.deleteWorkButton?.addEventListener("click", () => {
			this.confirmDeleteWorkFile()
		})

		this.newSubfolderButton?.addEventListener("click", () => {
			this.handleNewSubfolderAction()
		})

		document.addEventListener("click", () => {
			if (this.workContextMenu) {
				this.workContextMenu.style.display = "none"
			}
		})
	}

	private renderDropdown(viewModel: TemplateListViewModel) {
		this.lastViewModel = viewModel
		if (!this.templateDropdownMenu) return
		this.templateDropdownMenu.innerHTML = ""

		const appendHeader = (text: string) => {
			const header = document.createElement("li")
			header.innerHTML = `<span class="dropdown-header fw-bold text-uppercase fs-7" style="color: var(--text-muted, #888);">${text}</span>`
			this.templateDropdownMenu!.appendChild(header)
		}

		const appendTemplateEntry = (dir: TemplateDirectory, name: string) => {
			const li = document.createElement("li")
			const link = document.createElement("a")
			link.className = "dropdown-item py-1 d-flex align-items-center gap-2"
			link.href = "#"
			link.textContent = name.replace(/\.tex$/, "")
			link.style.color = "var(--text-main)"
			link.addEventListener("click", async (e) => {
				e.preventDefault()
				await this.handleFileOpen(dir, name)
			})
			li.appendChild(link)
			this.templateDropdownMenu!.appendChild(li)
		}

		appendHeader("Templates (Read-Only)")
		viewModel.templates.forEach((name) => appendTemplateEntry("template", name))

		const divider = document.createElement("li")
		divider.innerHTML = `<hr class="dropdown-divider" style="border-color: var(--border-color);">`
		this.templateDropdownMenu.appendChild(divider)

		appendHeader("Work (Editable)")
		if (viewModel.hasWorks && viewModel.workTree && viewModel.workTree.length > 0) {
			this.renderWorkTree(viewModel.workTree, 0)
		} else {
			const li = document.createElement("li")
			li.innerHTML = `<span class="dropdown-item-text text-muted py-1 small italic">No saved works</span>`
			this.templateDropdownMenu.appendChild(li)
		}

		this.updateDropdownButtonText(viewModel.selectedDisplayName)
		const currentDir = this.runtime.applicationService.getState().currentDir
		TikzEditorController.instance.setApplyButtonVisible(currentDir !== "template")
	}

	private renderWorkTree(nodes: WorkTreeNode[], depth = 0) {
		if (!this.templateDropdownMenu) return
		for (const node of nodes) {
			if (node.type === "folder") {
				const isCollapsed = this.collapsedFolders.has(node.path)
				const li = document.createElement("li")
				const div = document.createElement("div")
				div.className = "dropdown-item py-1 d-flex align-items-center justify-content-between text-muted"
				div.style.paddingLeft = `${12 + depth * 16}px`
				div.style.cursor = "pointer"

				const leftSpan = document.createElement("span")
				leftSpan.className = "d-flex align-items-center gap-2 fw-semibold"
				leftSpan.style.color = "var(--text-main)"
				leftSpan.innerHTML = `<span class="material-symbols-outlined fs-6 text-warning">${isCollapsed ? "folder" : "folder_open"}</span><span>${node.name}</span>`

				div.appendChild(leftSpan)
				div.addEventListener("click", (e) => {
					e.preventDefault()
					e.stopPropagation()
					if (isCollapsed) {
						this.collapsedFolders.delete(node.path)
					} else {
						this.collapsedFolders.add(node.path)
					}
					if (this.lastViewModel) {
						this.renderDropdown(this.lastViewModel)
					}
				})
				div.addEventListener("contextmenu", (e) => {
					e.preventDefault()
					e.stopPropagation()
					this.showContextMenu(e, null, node.path)
				})

				li.appendChild(div)
				this.templateDropdownMenu.appendChild(li)

				if (!isCollapsed && node.children && node.children.length > 0) {
					this.renderWorkTree(node.children, depth + 1)
				}
			} else {
				const li = document.createElement("li")
				const link = document.createElement("a")
				link.className = "dropdown-item py-1 d-flex align-items-center gap-2"
				link.href = "#"
				link.style.paddingLeft = `${12 + depth * 16}px`
				link.style.color = "var(--text-main)"

				const iconSpan = document.createElement("span")
				iconSpan.className = "material-symbols-outlined fs-6 text-secondary"
				iconSpan.textContent = "description"

				const textSpan = document.createElement("span")
				textSpan.textContent = node.name.replace(/\.tex$/, "")

				link.appendChild(iconSpan)
				link.appendChild(textSpan)

				link.addEventListener("click", async (e) => {
					e.preventDefault()
					await this.handleFileOpen("work", node.path)
				})
				link.addEventListener("contextmenu", (e) => {
					e.preventDefault()
					e.stopPropagation()
					this.showContextMenu(e, node.path, null)
				})
				li.appendChild(link)
				this.templateDropdownMenu.appendChild(li)
			}
		}
	}

	private updateDropdownButtonText(selectedDisplayName: string) {
		if (!this.templateDropdownBtn) return
		const span = this.templateDropdownBtn.querySelector("span")
		if (span) {
			span.textContent = selectedDisplayName
		} else {
			this.templateDropdownBtn.textContent = selectedDisplayName
		}
	}

	private async handleFileOpen(dir: TemplateDirectory, name: string) {
		const viewModel = await this.runtime.applicationService.openFile(dir, name)
		this.renderDropdown(viewModel)
		requestAnimationFrame(() => {
			CanvasController.instance?.fitView()
			LiveRenderController.instance?.fitView()
		})
	}

	private async confirmSaveToServer() {
		try {
			TikzEditorController.instance.updateEditorText(true)
			const filenameInput = this.saveServerFilenameInput.value.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
			const selectedFolder = (this.saveServerFolderSelect?.value || "").trim().replace(/^\/+|\/+$/g, "")

			let fullPath = filenameInput
			if (!fullPath.endsWith(".tex")) {
				fullPath = `${fullPath}.tex`
			}

			if (selectedFolder && !fullPath.startsWith(`${selectedFolder}/`)) {
				fullPath = `${selectedFolder}/${fullPath}`
			}

			const codeContent = TikzEditorController.instance.getCode()

			const viewModel = await this.runtime.applicationService.saveWork(fullPath)
			this.saveServerModal?.hide()
			this.renderDropdown(viewModel)

			if (MainController.instance.cloudSyncService?.isAuthenticated()) {
				void MainController.instance.cloudSyncService.saveFileToCloud(fullPath, codeContent)
			}
		} catch (err) {
			console.error("Failed to save file:", err)
		}
	}

	private showContextMenu(e: MouseEvent, filePath: string | null, folderPath: string | null) {
		if (!this.workContextMenu) return

		this.contextMenuTargetFile = filePath
		this.contextMenuTargetFolder = folderPath
		this.workContextMenu.style.display = "block"

		const rect = this.workContextMenu.getBoundingClientRect()
		let left = e.pageX
		let top = e.pageY

		if (left + rect.width > window.innerWidth) {
			left = window.innerWidth - rect.width - 10
		}
		if (left < 0) left = 10

		if (top + rect.height > window.innerHeight) {
			top = window.innerHeight - rect.height - 10
		}
		if (top < 0) top = 10

		this.workContextMenu.style.left = `${left}px`
		this.workContextMenu.style.top = `${top}px`
	}

	private async handleNewSubfolderAction() {
		const targetFolder = this.contextMenuTargetFolder || (this.contextMenuTargetFile ? this.contextMenuTargetFile.split("/").slice(0, -1).join("/") : "")
		const subfolderName = prompt("Enter subfolder name:")
		if (!subfolderName) return
		const cleanSub = subfolderName.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")
		if (!cleanSub || /[\0-\x1F\x7F]/.test(cleanSub)) {
			alert("Invalid subfolder name")
			return
		}

		const newFolderPath = targetFolder ? `${targetFolder}/${cleanSub}` : cleanSub
		const dummyFilePath = `${newFolderPath}/circuit.tex`

		try {
			const viewModel = await this.runtime.applicationService.saveWork(dummyFilePath)
			this.renderDropdown(viewModel)
		} catch (err) {
			console.error("Failed to create subfolder:", err)
		}
	}

	private async confirmDeleteWorkFile() {
		const target = this.contextMenuTargetFile || this.contextMenuTargetFolder
		if (!target) return
		try {
			const viewModel = await this.runtime.applicationService.deleteWork(target)
			this.renderDropdown(viewModel)
		} catch (err) {
			console.error("Failed to delete file/folder:", err)
		} finally {
			this.contextMenuTargetFile = null
			this.contextMenuTargetFolder = null
		}
	}
}
