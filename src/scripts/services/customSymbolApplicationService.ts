import { CircuitComponent } from "../components/circuitComponent"
import { ComponentSymbol } from "../components/componentSymbol"
import { CustomSymbolService, type CustomSymbolRecord } from "./customSymbolService"

export type CustomSymbolState = {
	customCategories: { name: string; symbolIds: string[] }[]
	customSymbols: CustomSymbolRecord[]
}

export class CustomSymbolApplicationService {
	private listeners: (() => void)[] = []

	public constructor(private readonly customSymbolService: CustomSymbolService) {}

	public onChange(listener: () => void): void {
		this.listeners.push(listener)
	}

	private notifyChange(): void {
		for (const listener of this.listeners) {
			listener()
		}
	}

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
		this.notifyChange()
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
		this.notifyChange()
		return this.loadState()
	}

	public async deleteGraphicsSymbol(
		tikzName: string,
		runtimeSymbols: ComponentSymbol[],
		currentCustomSymbols: CustomSymbolRecord[]
	): Promise<CustomSymbolState> {
		await this.customSymbolService.deleteCustomGraphicsSymbol(tikzName, runtimeSymbols, currentCustomSymbols)
		this.notifyChange()
		return this.loadState()
	}

	public async addCategory(name: string): Promise<CustomSymbolState> {
		await this.customSymbolService.addCategory(name.trim())
		this.notifyChange()
		return this.loadState()
	}

	public async deleteCategory(name: string): Promise<CustomSymbolState> {
		await this.customSymbolService.deleteCategory(name)
		this.notifyChange()
		return this.loadState()
	}

	public async renameCategory(oldName: string, newName: string): Promise<"no-op" | CustomSymbolState> {
		const trimmedName = newName.trim()
		if (!trimmedName || trimmedName === oldName) return "no-op"
		await this.customSymbolService.renameCategory(oldName, trimmedName)
		this.notifyChange()
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
		this.notifyChange()
		return this.loadState()
	}

	public async deleteCustomSymbol(symbolId: string, customSymbols?: CustomSymbolRecord[]): Promise<CustomSymbolState> {
		await this.customSymbolService.deleteCustomSymbol(symbolId, customSymbols)
		this.notifyChange()
		return this.loadState()
	}

	public async addSymbolToCategory(
		categoryName: string,
		symbolId: string,
		customSymbolData?: CustomSymbolRecord
	): Promise<CustomSymbolState> {
		await this.customSymbolService.addSymbolToCategory(categoryName, symbolId, customSymbolData)
		this.notifyChange()
		return this.loadState()
	}

	public async removeSymbolFromCategory(categoryName: string, symbolId: string): Promise<CustomSymbolState> {
		await this.customSymbolService.removeSymbolFromCategory(categoryName, symbolId)
		this.notifyChange()
		return this.loadState()
	}

	public async reorderCategories(orderedNames: string[]): Promise<void> {
		await this.customSymbolService.reorderCategories(orderedNames)
		this.notifyChange()
	}

	public async reorderSymbolsInCategory(categoryName: string, orderedIds: string[]): Promise<void> {
		await this.customSymbolService.reorderSymbolsInCategory(categoryName, orderedIds)
		this.notifyChange()
	}

	public async putCustomSymbol(customSymbol: CustomSymbolRecord): Promise<void> {
		await this.customSymbolService.putCustomSymbol(customSymbol)
		this.notifyChange()
	}

	public buildSubcircuitRecord(proposedName: string, subcircuitData: any, existingSymbols: CustomSymbolRecord[]) {
		return this.customSymbolService.buildSubcircuitRecord(proposedName, subcircuitData, existingSymbols)
	}

	public async saveSubcircuitRecord(
		categoryName: string,
		proposedName: string,
		subcircuitData: any,
		existingSymbols: CustomSymbolRecord[],
		existingCategoryNames: string[]
	): Promise<CustomSymbolState> {
		if (!existingCategoryNames.includes(categoryName)) {
			await this.customSymbolService.addCategory(categoryName)
		}
		const customSymbolData = this.customSymbolService.buildSubcircuitRecord(proposedName, subcircuitData, existingSymbols)
		await this.customSymbolService.addSymbolToCategory(categoryName, customSymbolData.id, customSymbolData)
		this.notifyChange()
		return this.loadState()
	}
}
