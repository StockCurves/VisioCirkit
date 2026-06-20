import type { CircuitComponent } from "../components/circuitComponent"
import { GroupComponent } from "../components/groupComponent"

type ResolveGroupSelectionOptions = {
	selectedComponents: CircuitComponent[]
	getCurrentSelection: () => CircuitComponent[]
	groupSelection: (selectedComponents: CircuitComponent[]) => void
	showAlert: (title: string, body: string) => Promise<void>
}

export class CustomSymbolSelectionController {
	public async resolveGroupSelection(options: ResolveGroupSelectionOptions): Promise<GroupComponent | null> {
		if (options.selectedComponents.length === 0) {
			await options.showAlert("Create Custom Component", "Please select components to create a custom component.")
			return null
		}

		if (options.selectedComponents.length === 1 && this.isGroupLike(options.selectedComponents[0])) {
			return options.selectedComponents[0] as GroupComponent
		}

		options.groupSelection(options.selectedComponents)
		const groupedSelection = options.getCurrentSelection()
		if (groupedSelection.length === 1 && this.isGroupLike(groupedSelection[0])) {
			return groupedSelection[0] as GroupComponent
		}

		await options.showAlert("Create Custom Component", "Failed to create a group, cannot save as custom component.")
		return null
	}

	private isGroupLike(component: CircuitComponent | undefined): component is GroupComponent {
		const componentType = component?.constructor?.name
		return componentType === "GroupComponent" || componentType === "SubcircuitComponent"
	}
}
