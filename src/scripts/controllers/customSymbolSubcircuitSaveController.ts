import type { ComponentSymbol } from "../components/componentSymbol"
import type { CircuitComponent } from "../components/circuitComponent"
import { GroupComponent } from "../components/groupComponent"
import { SubcircuitComponent } from "../components/subcircuitComponent"
import { CustomSymbolApplicationService } from "../services/customSymbolApplicationService"
import { CustomSymbolSaveController, type SaveSymbolModalResult } from "./customSymbolSaveController"
import { CustomSymbolSelectionController } from "./customSymbolSelectionController"
import { CustomSymbolWorkspaceController } from "./customSymbolWorkspaceController"

type CreateSubcircuitFromSelectionOptions = {
	selectedComponents: CircuitComponent[]
	getCurrentSelection: () => CircuitComponent[]
	groupSelection: (selectedComponents: CircuitComponent[]) => void
}

type CustomSymbolSubcircuitSaveControllerDependencies = {
	selectionController: CustomSymbolSelectionController
	saveController: CustomSymbolSaveController
	workspaceController: CustomSymbolWorkspaceController
	applicationService: CustomSymbolApplicationService
	circuitComponents: CircuitComponent[]
	runtimeSymbols: ComponentSymbol[]
	showAlert: (title: string, body: string) => Promise<void>
	addUndoState: () => void
}

export class CustomSymbolSubcircuitSaveController {
	private readonly selectionController: CustomSymbolSelectionController
	private readonly saveController: CustomSymbolSaveController
	private readonly workspaceController: CustomSymbolWorkspaceController
	private readonly applicationService: CustomSymbolApplicationService
	private readonly circuitComponents: CircuitComponent[]
	private readonly runtimeSymbols: ComponentSymbol[]
	private readonly showAlert: (title: string, body: string) => Promise<void>
	private readonly addUndoState: () => void

	public constructor(deps: CustomSymbolSubcircuitSaveControllerDependencies) {
		this.selectionController = deps.selectionController
		this.saveController = deps.saveController
		this.workspaceController = deps.workspaceController
		this.applicationService = deps.applicationService
		this.circuitComponents = deps.circuitComponents
		this.runtimeSymbols = deps.runtimeSymbols
		this.showAlert = deps.showAlert
		this.addUndoState = deps.addUndoState
	}

	public async createSubcircuitFromSelection(): Promise<void> {
		const groupComp = await this.selectionController.resolveGroupSelection({
			selectedComponents: this.getSelectedComponents(),
			getCurrentSelection: () => this.getSelectedComponents(),
			groupSelection: (selectedComponents) => {
				GroupComponent.group(selectedComponents)
			},
			showAlert: this.showAlert,
		})
		if (!groupComp) return

		const saveRequest = await this.saveController.open({
			initialName: groupComp.displayName !== "Group" ? groupComp.displayName : "",
			categories: this.workspaceController.customCategories.map((category) => category.name),
			showAlert: this.showAlert,
		})
		if (!saveRequest) return

		await this.saveGroupedSelectionAsCustomSymbol(groupComp, saveRequest)
	}

	private getSelectedComponents(): CircuitComponent[] {
		return this.circuitComponents.filter((component) => component.selected)
	}

	private async saveGroupedSelectionAsCustomSymbol(
		group: GroupComponent,
		saveRequest: SaveSymbolModalResult
	): Promise<void> {
		const children = this.restoreGroupedSelection(group)
		if (!children) {
			return
		}

		const subJson = new SubcircuitComponent(saveRequest.name, children).toJson()
		const state = await this.applicationService.saveSubcircuitRecord(
			saveRequest.categoryName,
			saveRequest.name,
			subJson,
			this.workspaceController.customSymbols,
			this.workspaceController.customCategories.map((category) => category.name)
		)
		this.workspaceController.applyAndRender(state, this.runtimeSymbols)
		this.addUndoState()
	}

	private restoreGroupedSelection(group: GroupComponent): GroupComponent[] | null {
		const idx = this.circuitComponents.indexOf(group)
		if (idx === -1) {
			void this.showAlert("Save Custom Component", "Cannot find the group object; unable to save.")
			return null
		}

		const children = [...group.groupedComponents]
		this.circuitComponents.splice(idx, 1, ...children)
		group.groupedComponents = []
		group.selectionElement?.remove()
		group.visualization.remove()
		return children
	}
}
