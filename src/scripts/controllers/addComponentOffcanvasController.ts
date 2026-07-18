import type { ComponentSymbol } from "../components/componentSymbol"
import type { CircuitComponent } from "../components/circuitComponent"
import { ComponentLibraryController } from "./componentLibraryController"
import { ShapeLibraryController } from "./shapeLibraryController"
import { SymbolLibraryMenuController } from "./symbolLibraryMenuController"

type AddComponentOffcanvasControllerDependencies = {
	componentLibraryController: ComponentLibraryController
	shapeLibraryController: ShapeLibraryController
	symbolLibraryMenuController: SymbolLibraryMenuController
	hideDrawer: () => void
	switchToPanMode: () => void
	switchToComponentMode: () => void
	cancelComponentPlacement: () => void
	placeComponent: (component: CircuitComponent) => void
	openPrompt: (title: string, message: string, defaultValue?: string) => Promise<string | null>
	openRenameModal: (title: string, currentName: string) => Promise<string | null>
	openConfirm: (title: string, body: string) => Promise<boolean>
	addCustomCategory: (name: string) => Promise<void>
	loadCustomCategories: () => Promise<void>
	getCustomCategoryNames: () => string[]
	getSymbolByName: (symbolName: string) => ComponentSymbol | undefined
	openSymbolEditor: (symbolName: string) => void
	renameCustomGraphicsSymbol: (oldName: string, newName: string) => Promise<void>
	deleteCustomGraphicsSymbol: (symbolName: string) => Promise<void>
	addSymbolToCategory: (categoryName: string, symbolName: string) => Promise<void>
	duplicateSymbol: (symbol: ComponentSymbol, newName: string, categoryName: string) => Promise<void>
}

type DrawerCategory = {
	id: string
	name: string
	kind: "shape" | "component"
	sourceId: string
}

const DRAWER_CATEGORY_STORAGE_KEY = "visiocirkit.componentDrawer.visibleCategories"
const DRAWER_CATEGORY_REMEMBER_KEY = "visiocirkit.componentDrawer.rememberCategories"

export class AddComponentOffcanvasController {
	private readonly componentLibraryController: ComponentLibraryController
	private readonly shapeLibraryController: ShapeLibraryController
	private readonly symbolLibraryMenuController: SymbolLibraryMenuController
	private readonly hideDrawer: () => void
	private readonly switchToPanMode: () => void
	private readonly switchToComponentMode: () => void
	private readonly cancelComponentPlacement: () => void
	private readonly placeComponent: (component: CircuitComponent) => void
	private readonly openPrompt: (title: string, message: string, defaultValue?: string) => Promise<string | null>
	private readonly openRenameModal: (title: string, currentName: string) => Promise<string | null>
	private readonly openConfirm: (title: string, body: string) => Promise<boolean>
	private readonly addCustomCategory: (name: string) => Promise<void>
	private readonly loadCustomCategories: () => Promise<void>
	private readonly getCustomCategoryNames: () => string[]
	private readonly getSymbolByName: (symbolName: string) => ComponentSymbol | undefined
	private readonly openSymbolEditor: (symbolName: string) => void
	private readonly renameCustomGraphicsSymbol: (oldName: string, newName: string) => Promise<void>
	private readonly deleteCustomGraphicsSymbol: (symbolName: string) => Promise<void>
	private readonly addSymbolToCategory: (categoryName: string, symbolName: string) => Promise<void>
	private readonly duplicateSymbol: (symbol: ComponentSymbol, newName: string, categoryName: string) => Promise<void>
	private leftOffcanvasAccordion: HTMLDivElement | null = null
	private symbols: ComponentSymbol[] = []
	private visibleCategoryIds: string[] | null = null
	private chooserBound = false

	public constructor(deps: AddComponentOffcanvasControllerDependencies) {
		this.componentLibraryController = deps.componentLibraryController
		this.shapeLibraryController = deps.shapeLibraryController
		this.symbolLibraryMenuController = deps.symbolLibraryMenuController
		this.hideDrawer = deps.hideDrawer
		this.switchToPanMode = deps.switchToPanMode
		this.switchToComponentMode = deps.switchToComponentMode
		this.cancelComponentPlacement = deps.cancelComponentPlacement
		this.placeComponent = deps.placeComponent
		this.openPrompt = deps.openPrompt
		this.openRenameModal = deps.openRenameModal
		this.openConfirm = deps.openConfirm
		this.addCustomCategory = deps.addCustomCategory
		this.loadCustomCategories = deps.loadCustomCategories
		this.getCustomCategoryNames = deps.getCustomCategoryNames
		this.getSymbolByName = deps.getSymbolByName
		this.openSymbolEditor = deps.openSymbolEditor
		this.renameCustomGraphicsSymbol = deps.renameCustomGraphicsSymbol
		this.deleteCustomGraphicsSymbol = deps.deleteCustomGraphicsSymbol
		this.addSymbolToCategory = deps.addSymbolToCategory
		this.duplicateSymbol = deps.duplicateSymbol
	}

	public async initialize(leftOffcanvas: HTMLDivElement, leftOffcanvasAccordion: HTMLDivElement, symbols: ComponentSymbol[]): Promise<void> {
		this.leftOffcanvasAccordion = leftOffcanvasAccordion
		this.symbols = symbols

		this.componentLibraryController.bindToolbar(leftOffcanvas, {
			switchToPanMode: this.switchToPanMode,
			openPrompt: this.openPrompt,
			addCategory: (name) => {
				void this.addCustomCategory(name)
			},
		})

		await this.loadCustomCategories()
		this.renderLibraries()
		this.bindCategoryChooser()
	}

	private renderLibraries(): void {
		if (!this.leftOffcanvasAccordion) return

		const categories = this.getDrawerCategories()
		const visibleCategoryIds = this.loadVisibleCategoryIds(categories)
		const visibleShapeIds = categories
			.filter((category) => category.kind === "shape" && visibleCategoryIds.includes(category.id))
			.map((category) => category.sourceId)
		const visibleComponentGroupNames = new Set(
			categories
				.filter((category) => category.kind === "component" && visibleCategoryIds.includes(category.id))
				.map((category) => category.sourceId)
		)
		const visibleSymbols = this.symbols.filter((symbol) =>
			visibleComponentGroupNames.has(symbol.groupName || "Unsorted components")
		)

		this.shapeLibraryController.render(this.leftOffcanvasAccordion, {
			hideDrawer: this.hideDrawer,
			switchToPanMode: this.switchToPanMode,
			switchToComponentMode: this.switchToComponentMode,
			cancelComponentPlacement: this.cancelComponentPlacement,
			placeComponent: this.placeComponent,
		}, visibleShapeIds)

		this.componentLibraryController.render(this.leftOffcanvasAccordion, visibleSymbols, {
			hideDrawer: this.hideDrawer,
			switchToComponentMode: this.switchToComponentMode,
			cancelComponentPlacement: this.cancelComponentPlacement,
			placeComponent: this.placeComponent,
			openContextMenu: (event, symbol) =>
				this.symbolLibraryMenuController.openAndExecute({
					clientX: event.clientX,
					clientY: event.clientY,
					symbolName: symbol.tikzName,
					isCustomSymbol: !!symbol.isCustomSymbol,
					categoryNames: this.getCustomCategoryNames(),
					openPrompt: this.openPrompt,
					openRenameModal: this.openRenameModal,
					openConfirm: this.openConfirm,
					openEditor: this.openSymbolEditor,
					renameSymbol: (oldName, newName) => this.renameCustomGraphicsSymbol(oldName, newName),
					deleteSymbol: (symbolName) => this.deleteCustomGraphicsSymbol(symbolName),
					addCategory: (categoryName) => this.addCustomCategory(categoryName),
					addToCategory: (categoryName, symbolName) => this.addSymbolToCategory(categoryName, symbolName),
					duplicateSymbol: (symbolName, newName, categoryName) => {
						const menuSymbol = symbolName === symbol.tikzName ? symbol : this.getSymbolByName(symbolName)
						if (!menuSymbol) return Promise.resolve()
						return this.duplicateSymbol(menuSymbol, newName, categoryName)
					},
				}),
		})
	}

	private bindCategoryChooser(): void {
		const moreButton = document.getElementById("shapeLibraryMoreButton") as HTMLButtonElement | null
		const applyButton = document.getElementById("shapeLibraryApplyButton") as HTMLButtonElement | null
		const categoryList = document.getElementById("shapeLibraryCategoryList") as HTMLDivElement | null
		const rememberCheckbox = document.getElementById("shapeLibraryRememberCheckbox") as HTMLInputElement | null

		if (!moreButton || !applyButton || !categoryList || !rememberCheckbox) return

		this.renderChooserOptions(categoryList)
		rememberCheckbox.checked = localStorage.getItem(DRAWER_CATEGORY_REMEMBER_KEY) === "true"

		if (this.chooserBound) return
		this.chooserBound = true

		moreButton.addEventListener("click", () => {
			this.renderChooserOptions(categoryList)
			rememberCheckbox.checked = localStorage.getItem(DRAWER_CATEGORY_REMEMBER_KEY) === "true"
		})

		applyButton.addEventListener("click", () => {
			const selectedIds = Array.from(categoryList.querySelectorAll<HTMLInputElement>("input[type='checkbox']"))
				.filter((checkbox) => checkbox.checked)
				.map((checkbox) => checkbox.value)

			this.visibleCategoryIds = selectedIds
			if (rememberCheckbox.checked) {
				localStorage.setItem(DRAWER_CATEGORY_REMEMBER_KEY, "true")
				localStorage.setItem(DRAWER_CATEGORY_STORAGE_KEY, JSON.stringify(selectedIds))
			} else {
				localStorage.removeItem(DRAWER_CATEGORY_REMEMBER_KEY)
				localStorage.removeItem(DRAWER_CATEGORY_STORAGE_KEY)
			}

			this.renderLibraries()
		})
	}

	private renderChooserOptions(categoryList: HTMLDivElement): void {
		const categories = this.getDrawerCategories()
		const visibleIds = this.loadVisibleCategoryIds(categories)
		categoryList.innerHTML = ""

		for (const category of categories) {
			const option = categoryList.appendChild(document.createElement("label"))
			option.classList.add("shape-library-option")

			const checkbox = option.appendChild(document.createElement("input"))
			checkbox.type = "checkbox"
			checkbox.value = category.id
			checkbox.checked = visibleIds.includes(category.id)

			const label = option.appendChild(document.createElement("span"))
			label.textContent = category.name
		}
	}

	private getDrawerCategories(): DrawerCategory[] {
		const shapeCategories = this.shapeLibraryController.getCategories().map((category) => ({
			id: `shape:${category.id}`,
			name: category.name,
			kind: "shape" as const,
			sourceId: category.id,
		}))
		const componentGroupNames = Array.from(
			this.symbols.reduce((groups, symbol) => groups.add(symbol.groupName || "Unsorted components"), new Set<string>())
		)
		const componentCategories = componentGroupNames.map((groupName) => ({
			id: `component:${groupName}`,
			name: groupName,
			kind: "component" as const,
			sourceId: groupName,
		}))
		return shapeCategories.concat(componentCategories)
	}

	private loadVisibleCategoryIds(categories: DrawerCategory[]): string[] {
		const defaultIds = categories.map((category) => category.id)
		if (this.visibleCategoryIds) return this.visibleCategoryIds.filter((id) => categories.some((category) => category.id === id))
		if (localStorage.getItem(DRAWER_CATEGORY_REMEMBER_KEY) !== "true") return defaultIds

		try {
			const storedIds = JSON.parse(localStorage.getItem(DRAWER_CATEGORY_STORAGE_KEY) ?? "[]")
			if (!Array.isArray(storedIds)) return defaultIds
			return storedIds.filter((id) => categories.some((category) => category.id === id))
		} catch (_err) {
			return defaultIds
		}
	}
}
