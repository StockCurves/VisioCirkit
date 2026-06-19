import { CircuitComponent } from "../components/circuitComponent"
import { ComponentSymbol } from "../components/componentSymbol"
import { CustomSymbolService, type CustomSymbolRecord } from "./customSymbolService"

export type CustomSymbolState = {
	customCategories: { name: string; symbolIds: string[] }[]
	customSymbols: CustomSymbolRecord[]
}

export class CustomSymbolApplicationService {
	public constructor(private readonly customSymbolService: CustomSymbolService) {}

	public async loadState(): Promise<CustomSymbolState> {
		return {
			customCategories: await this.customSymbolService.getCustomCategories(),
			customSymbols: await this.customSymbolService.getCustomSymbols(),
		}
	}

	public async loadRuntimeSymbols(symbolDB: Element, runtimeSymbols: ComponentSymbol[]): Promise<CustomSymbolState> {
		const customSymbols = await this.customSymbolService.loadCustomSymbolsIntoDomAndRuntime(symbolDB, runtimeSymbols)
		return {
			customCategories: await this.customSymbolService.getCustomCategories(),
			customSymbols,
		}
	}

	public async duplicateGraphicsSymbol(
		symbolDB: Element | null,
		runtimeSymbols: ComponentSymbol[],
		currentCustomSymbols: CustomSymbolRecord[],
		originalSymbol: ComponentSymbol,
		newTikzName: string,
		categoryName: string
	): Promise<"missing-dom" | "missing-metadata" | CustomSymbolState> {
		if (!symbolDB) return "missing-dom"
		const duplicated = await this.customSymbolService.duplicateSymbol(
			symbolDB,
			runtimeSymbols,
			originalSymbol,
			newTikzName,
			categoryName
		)
		if (!duplicated) return "missing-metadata"

		this.customSymbolService.replaceCustomSymbolRecord(currentCustomSymbols, duplicated.updatedRecord)
		return this.loadState()
	}

	public async renameGraphicsSymbol(
		oldTikzName: string,
		newTikzName: string,
		symbolDB: Element | null,
		runtimeSymbols: ComponentSymbol[],
		currentCustomSymbols: CustomSymbolRecord[],
		circuitComponents: CircuitComponent[]
	): Promise<"no-op" | "missing-dom" | CustomSymbolState> {
		const trimmedName = newTikzName.trim()
		if (!trimmedName || trimmedName === oldTikzName) return "no-op"
		if (!symbolDB) return "missing-dom"

		await this.customSymbolService.renameCustomGraphicsSymbol(
			oldTikzName,
			trimmedName,
			symbolDB,
			runtimeSymbols,
			currentCustomSymbols,
			circuitComponents
		)
		return this.loadState()
	}

	public async deleteGraphicsSymbol(
		tikzName: string,
		runtimeSymbols: ComponentSymbol[],
		currentCustomSymbols: CustomSymbolRecord[]
	): Promise<CustomSymbolState> {
		await this.customSymbolService.deleteCustomGraphicsSymbol(tikzName, runtimeSymbols, currentCustomSymbols)
		return this.loadState()
	}

	public async addCategory(name: string): Promise<CustomSymbolState> {
		await this.customSymbolService.addCategory(name.trim())
		return this.loadState()
	}

	public async deleteCategory(name: string): Promise<CustomSymbolState> {
		await this.customSymbolService.deleteCategory(name)
		return this.loadState()
	}

	public async renameCategory(oldName: string, newName: string): Promise<"no-op" | CustomSymbolState> {
		const trimmedName = newName.trim()
		if (!trimmedName || trimmedName === oldName) return "no-op"
		await this.customSymbolService.renameCategory(oldName, trimmedName)
		return this.loadState()
	}

	public async renameCustomSymbol(
		symbolId: string,
		newName: string,
		currentCustomSymbols: CustomSymbolRecord[],
		circuitComponents: CircuitComponent[]
	): Promise<"no-op" | "missing" | CustomSymbolState> {
		const trimmedName = newName.trim()
		if (!trimmedName) return "no-op"
		const renamed = await this.customSymbolService.renameCustomSymbol(
			symbolId,
			trimmedName,
			currentCustomSymbols,
			circuitComponents
		)
		if (!renamed) return "missing"
		return this.loadState()
	}

	public async deleteCustomSymbol(symbolId: string, currentCustomSymbols: CustomSymbolRecord[]): Promise<CustomSymbolState> {
		await this.customSymbolService.deleteCustomSymbol(symbolId, currentCustomSymbols)
		return this.loadState()
	}

	public async addSymbolToCategory(
		categoryName: string,
		symbolId: string,
		customSymbolData?: CustomSymbolRecord
	): Promise<CustomSymbolState> {
		await this.customSymbolService.addSymbolToCategory(categoryName, symbolId, customSymbolData)
		return this.loadState()
	}

	public async removeSymbolFromCategory(categoryName: string, symbolId: string): Promise<CustomSymbolState> {
		await this.customSymbolService.removeSymbolFromCategory(categoryName, symbolId)
		return this.loadState()
	}

	public putCustomSymbol(customSymbol: CustomSymbolRecord): Promise<void> {
		return this.customSymbolService.putCustomSymbol(customSymbol)
	}

	public buildSubcircuitRecord(proposedName: string, subcircuitData: any, existingSymbols: CustomSymbolRecord[]) {
		return this.customSymbolService.buildSubcircuitRecord(proposedName, subcircuitData, existingSymbols)
	}
}
