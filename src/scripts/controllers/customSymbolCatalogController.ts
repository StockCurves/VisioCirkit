import type { ComponentSymbol } from "../components/componentSymbol"
import type { CircuitComponent } from "../components/circuitComponent"
import type { CustomSymbolRecord } from "../services/customSymbolService"
import { CustomSymbolApplicationService } from "../services/customSymbolApplicationService"
import { CustomSymbolWorkspaceController } from "./customSymbolWorkspaceController"

type CustomSymbolCatalogControllerDependencies = {
	applicationService: CustomSymbolApplicationService
	workspaceController: CustomSymbolWorkspaceController
	runtimeSymbols: ComponentSymbol[]
	circuitComponents: CircuitComponent[]
}

export class CustomSymbolCatalogController {
	private readonly applicationService: CustomSymbolApplicationService
	private readonly workspaceController: CustomSymbolWorkspaceController
	private readonly runtimeSymbols: ComponentSymbol[]
	private readonly circuitComponents: CircuitComponent[]

	public constructor(deps: CustomSymbolCatalogControllerDependencies) {
		this.applicationService = deps.applicationService
		this.workspaceController = deps.workspaceController
		this.runtimeSymbols = deps.runtimeSymbols
		this.circuitComponents = deps.circuitComponents
	}

	public async loadAndRenderCustomCategories(): Promise<void> {
		const state = await this.applicationService.loadState()
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
	}

	public async addCustomCategory(name: string): Promise<void> {
		const trimmed = name.trim()
		if (!trimmed) return
		const state = await this.applicationService.addCategory(trimmed)
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
	}

	public async deleteCustomCategory(name: string): Promise<void> {
		const state = await this.applicationService.deleteCategory(name)
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
	}

	public async renameCustomCategory(oldName: string, newName: string): Promise<void> {
		const state = await this.applicationService.renameCategory(oldName, newName)
		if (state === "no-op") return
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
	}

	public async renameCustomSymbol(symbolId: string, newName: string): Promise<void> {
		const state = await this.applicationService.renameCustomSymbol(
			symbolId,
			newName,
			this.workspaceController.customSymbols,
			this.circuitComponents
		)
		if (state === "no-op" || state === "missing") return
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
	}

	public async deleteCustomSymbol(symbolId: string): Promise<void> {
		const state = await this.applicationService.deleteCustomSymbol(symbolId, this.workspaceController.customSymbols)
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
	}

	public async addSymbolToCategory(
		categoryName: string,
		symbolId: string,
		customSymbolData?: CustomSymbolRecord
	): Promise<void> {
		const state = await this.applicationService.addSymbolToCategory(categoryName, symbolId, customSymbolData)
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
	}

	public async removeSymbolFromCategory(categoryName: string, symbolId: string): Promise<void> {
		const state = await this.applicationService.removeSymbolFromCategory(categoryName, symbolId)
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
	}

	public async putCustomSymbolRecord(customSymbol: CustomSymbolRecord): Promise<void> {
		await this.applicationService.putCustomSymbol(customSymbol)
	}
}
