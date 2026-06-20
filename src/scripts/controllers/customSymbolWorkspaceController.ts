import type { ComponentSymbol } from "../components/componentSymbol"
import type { CircuitComponent } from "../components/circuitComponent"
import { createCustomSymbolDrawerActions, type CustomSymbolDrawerActionDependencies } from "./customSymbolDrawerActionsFactory"
import { CustomSymbolStateController, type CustomSymbolState } from "./customSymbolStateController"

export class CustomSymbolWorkspaceController {
	private readonly stateController = new CustomSymbolStateController()
	private readonly drawerActions

	constructor(deps: Omit<CustomSymbolDrawerActionDependencies, "switchToComponentMode" | "cancelComponentPlacement" | "placeComponent"> & {
		switchToComponentMode: () => void
		cancelComponentPlacement: () => void
		placeComponent: (component: CircuitComponent) => void
	}) {
		this.drawerActions = createCustomSymbolDrawerActions(deps)
	}

	public get customCategories() {
		return this.stateController.customCategories
	}

	public get customSymbols() {
		return this.stateController.customSymbols
	}

	public applyState(state: CustomSymbolState): void {
		this.stateController.applyState(state)
	}

	public applyAndRender(state: CustomSymbolState, runtimeSymbols: ComponentSymbol[]): void {
		this.stateController.applyAndRender(state, runtimeSymbols, this.drawerActions)
	}

	public render(runtimeSymbols: ComponentSymbol[]): void {
		this.stateController.render(runtimeSymbols, this.drawerActions)
	}
}
