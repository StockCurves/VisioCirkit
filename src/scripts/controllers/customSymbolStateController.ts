import type { ComponentSymbol } from "../components/componentSymbol"
import {
	CustomSymbolDrawerController,
	type CustomCategory,
	type CustomSymbolDrawerActions,
	type DrawerCustomSymbolRecord,
	type DrawerRuntimeSymbol,
} from "./customSymbolDrawerController"

export type CustomSymbolState = {
	customCategories: CustomCategory[]
	customSymbols: DrawerCustomSymbolRecord[]
}

export class CustomSymbolStateController {
	private state: CustomSymbolState = {
		customCategories: [],
		customSymbols: [],
	}

	constructor(private readonly drawerController = new CustomSymbolDrawerController()) {}

	public get customCategories(): CustomCategory[] {
		return this.state.customCategories
	}

	public get customSymbols(): DrawerCustomSymbolRecord[] {
		return this.state.customSymbols
	}

	public applyState(state: CustomSymbolState): void {
		this.state = state
	}

	public render(runtimeSymbols: ComponentSymbol[], actions: CustomSymbolDrawerActions): void {
		this.drawerController.render(this.state.customCategories, this.state.customSymbols, runtimeSymbols, actions)
	}

	public applyAndRender(state: CustomSymbolState, runtimeSymbols: ComponentSymbol[], actions: CustomSymbolDrawerActions): void {
		this.applyState(state)
		this.render(runtimeSymbols, actions)
	}
}
