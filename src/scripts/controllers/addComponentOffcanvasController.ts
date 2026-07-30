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
	items: DrawerItem[]
}

type DrawerItem = {
	id: string
	name: string
	sourceId: string
	preview?: () => SVGElement | null
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
		const visibleItemIds = this.loadVisibleItemIds(categories)
		const visibleShapeIds = categories
			.filter((category) => category.kind === "shape" && visibleCategoryIds.includes(category.id))
			.map((category) => category.sourceId)
		const visibleShapeItemIds = categories
			.filter((category) => category.kind === "shape" && visibleCategoryIds.includes(category.id))
			.flatMap((category) => category.items.filter((item) => visibleItemIds.includes(item.id)).map((item) => item.sourceId))
		const visibleComponentGroupNames = new Set(
			categories
				.filter((category) => category.kind === "component" && visibleCategoryIds.includes(category.id))
				.map((category) => category.sourceId)
		)
		const visibleSymbols = this.symbols.filter((symbol) =>
			visibleComponentGroupNames.has(symbol.groupName || "Unsorted components") &&
			visibleItemIds.includes(this.createComponentItemId(symbol.groupName || "Unsorted components", symbol.tikzName))
		)

		this.shapeLibraryController.render(this.leftOffcanvasAccordion, {
			hideDrawer: this.hideDrawer,
			switchToPanMode: this.switchToPanMode,
			switchToComponentMode: this.switchToComponentMode,
			cancelComponentPlacement: this.cancelComponentPlacement,
			placeComponent: this.placeComponent,
		}, visibleShapeIds, visibleShapeItemIds)

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
				.reduce((ids, checkbox) => {
					if (checkbox.checked) {
						const parentCategoryId = checkbox.dataset.parentCategoryId
						if (parentCategoryId) ids.add(parentCategoryId)
						ids.add(checkbox.value)
					}
					return ids
				}, new Set<string>())

			this.visibleCategoryIds = Array.from(selectedIds)
			if (rememberCheckbox.checked) {
				localStorage.setItem(DRAWER_CATEGORY_REMEMBER_KEY, "true")
				localStorage.setItem(DRAWER_CATEGORY_STORAGE_KEY, JSON.stringify(this.visibleCategoryIds))
			} else {
				localStorage.removeItem(DRAWER_CATEGORY_REMEMBER_KEY)
				localStorage.removeItem(DRAWER_CATEGORY_STORAGE_KEY)
			}

			this.renderLibraries()
		})
	}

	private renderChooserOptions(categoryList: HTMLDivElement): void {
		const categories = this.getDrawerCategories()
		const visibleIds = this.loadVisibleIds(categories)
		categoryList.innerHTML = ""

		for (const [categoryIndex, category] of categories.entries()) {
			const option = categoryList.appendChild(document.createElement("div"))
			option.classList.add("shape-library-option", "shape-library-category-option")

			const toggleButton = option.appendChild(document.createElement("button"))
			toggleButton.type = "button"
			toggleButton.classList.add("shape-library-category-toggle")
			toggleButton.setAttribute("aria-expanded", "false")
			toggleButton.setAttribute("aria-label", `Expand ${category.name}`)
			const toggleIcon = toggleButton.appendChild(document.createElement("span"))
			toggleIcon.classList.add("material-symbols-outlined")
			toggleIcon.textContent = "chevron_right"

			const checkbox = option.appendChild(document.createElement("input"))
			checkbox.type = "checkbox"
			checkbox.value = category.id
			checkbox.dataset.categoryId = category.id
			checkbox.id = `shapeLibraryCategoryCheckbox-${categoryIndex}`
			const checkedItemCount = category.items.filter((item) => visibleIds.includes(item.id)).length
			checkbox.checked = visibleIds.includes(category.id) && checkedItemCount === category.items.length
			checkbox.indeterminate = visibleIds.includes(category.id) && checkedItemCount > 0 && checkedItemCount < category.items.length

			const label = option.appendChild(document.createElement("label"))
			label.htmlFor = checkbox.id
			label.textContent = category.name
			label.addEventListener("click", (ev) => {
				ev.stopPropagation()
			})

			const itemList = categoryList.appendChild(document.createElement("div"))
			itemList.classList.add("shape-library-item-list")
			itemList.hidden = true

			const toggleItemList = () => {
				itemList.hidden = !itemList.hidden
				const expanded = String(!itemList.hidden)
				toggleButton.setAttribute("aria-expanded", expanded)
				toggleButton.setAttribute("aria-label", itemList.hidden ? `Expand ${category.name}` : `Collapse ${category.name}`)
				toggleIcon.textContent = itemList.hidden ? "chevron_right" : "expand_more"
			}

			option.addEventListener("click", (ev) => {
				if (ev.target === checkbox) return
				toggleItemList()
			})

			toggleButton.addEventListener("click", (ev) => {
				ev.stopPropagation()
				toggleItemList()
			})

			for (const item of category.items) {
				const itemOption = itemList.appendChild(document.createElement("label"))
				itemOption.classList.add("shape-library-option", "shape-library-item-option")

				const itemCheckbox = itemOption.appendChild(document.createElement("input"))
				itemCheckbox.type = "checkbox"
				itemCheckbox.value = item.id
				itemCheckbox.dataset.parentCategoryId = category.id
				itemCheckbox.checked = visibleIds.includes(category.id) && visibleIds.includes(item.id)

				const preview = itemOption.appendChild(document.createElement("span"))
				preview.classList.add("shape-library-preview")
				const previewSvg = item.preview?.()
				if (previewSvg) {
					preview.appendChild(previewSvg)
				}

				const itemLabel = itemOption.appendChild(document.createElement("span"))
				itemLabel.textContent = item.name
			}

			checkbox.addEventListener("change", () => {
				const itemCheckboxes = itemList.querySelectorAll<HTMLInputElement>("input[type='checkbox']")
				itemCheckboxes.forEach((itemCheckbox) => {
					itemCheckbox.checked = checkbox.checked
				})
				checkbox.indeterminate = false
			})

			itemList.addEventListener("change", () => {
				this.syncCategoryCheckbox(checkbox, itemList)
			})
		}
	}

	private getDrawerCategories(): DrawerCategory[] {
		const shapeCategories = this.shapeLibraryController.getCategories().map((category) => ({
			id: `shape:${category.id}`,
			name: category.name,
			kind: "shape" as const,
			sourceId: category.id,
			items: (category.items ?? []).map((item) => ({
				id: this.createShapeItemId(category.id, item.id),
				name: item.name,
				sourceId: item.id,
				preview: () => this.shapeLibraryController.renderPreview?.(item.id) ?? null,
			})),
		}))
		const componentGroupNames = Array.from(
			this.symbols.reduce((groups, symbol) => groups.add(symbol.groupName || "Unsorted components"), new Set<string>())
		)
		const componentCategories = componentGroupNames.map((groupName) => ({
			id: `component:${groupName}`,
			name: groupName,
			kind: "component" as const,
			sourceId: groupName,
			items: this.symbols
				.filter((symbol) => (symbol.groupName || "Unsorted components") === groupName)
				.map((symbol) => ({
					id: this.createComponentItemId(groupName, symbol.tikzName),
					name: symbol.displayName || symbol.tikzName,
					sourceId: symbol.tikzName,
					preview: () => this.renderSymbolPreview(symbol),
				})),
		}))
		return shapeCategories.concat(componentCategories)
	}

	private loadVisibleCategoryIds(categories: DrawerCategory[]): string[] {
		const visibleIds = this.loadVisibleIds(categories)
		return categories
			.filter((category) =>
				visibleIds.includes(category.id) &&
				category.items.some((item) => visibleIds.includes(item.id))
			)
			.map((category) => category.id)
	}

	private loadVisibleItemIds(categories: DrawerCategory[]): string[] {
		const visibleIds = this.loadVisibleIds(categories)
		const visibleCategoryIds = this.loadVisibleCategoryIds(categories)
		return categories
			.filter((category) => visibleCategoryIds.includes(category.id))
			.flatMap((category) => category.items.map((item) => item.id))
			.filter((id) => visibleIds.includes(id))
	}

	private loadVisibleIds(categories: DrawerCategory[]): string[] {
		const defaultIds = categories.flatMap((category) => [category.id].concat(category.items.map((item) => item.id)))
		if (this.visibleCategoryIds) return this.visibleCategoryIds.filter((id) => defaultIds.includes(id))
		if (localStorage.getItem(DRAWER_CATEGORY_REMEMBER_KEY) !== "true") return defaultIds

		try {
			const storedIds = JSON.parse(localStorage.getItem(DRAWER_CATEGORY_STORAGE_KEY) ?? "[]")
			if (!Array.isArray(storedIds)) return defaultIds
			const visibleIds = storedIds.filter((id) => defaultIds.includes(id))
			for (const category of categories) {
				const hasCategory = visibleIds.includes(category.id)
				const hasAnyItem = category.items.some((item) => visibleIds.includes(item.id))
				if (hasCategory && !hasAnyItem) {
					visibleIds.push(...category.items.map((item) => item.id))
				}
			}
			return visibleIds
		} catch (_err) {
			return defaultIds
		}
	}

	private syncCategoryCheckbox(categoryCheckbox: HTMLInputElement, itemList: HTMLDivElement): void {
		const itemCheckboxes = Array.from(itemList.querySelectorAll<HTMLInputElement>("input[type='checkbox']"))
		const checkedCount = itemCheckboxes.filter((itemCheckbox) => itemCheckbox.checked).length
		categoryCheckbox.checked = checkedCount === itemCheckboxes.length
		categoryCheckbox.indeterminate = checkedCount > 0 && checkedCount < itemCheckboxes.length
	}

	private createShapeItemId(categoryId: string, itemId: string): string {
		return `shape-item:${categoryId}:${itemId}`
	}

	private createComponentItemId(groupName: string, symbolName: string): string {
		return `component-item:${groupName}:${symbolName}`
	}

	private renderSymbolPreview(symbol: ComponentSymbol): SVGElement | null {
		if (!symbol.symbolElement || !symbol.viewBox) return null

		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
		svg.setAttribute("viewBox", `0 0 ${symbol.viewBox.width} ${symbol.viewBox.height}`)

		const use = document.createElementNS("http://www.w3.org/2000/svg", "use")
		use.setAttribute("href", `#${symbol.symbolElement.id()}`)
		use.setAttribute("width", String(symbol.viewBox.width))
		use.setAttribute("height", String(symbol.viewBox.height))
		svg.appendChild(use)

		return svg
	}
}
