import { NodeSymbolComponent, PathSymbolComponent, SubcircuitComponent } from "../internal"
import type { CircuitComponent } from "../internal"
import type { CustomSymbolRecord } from "../services/customSymbolService"
import type {
	CustomSymbolDrawerActions,
	DrawerCustomSymbolRecord,
	DrawerRuntimeSymbol,
} from "./customSymbolDrawerController"

export type CustomSymbolDrawerActionDependencies = {
	hideDrawer: () => void
	openRenameModal: (title: string, currentName: string) => Promise<string | null>
	openConfirm: (title: string, body: string) => Promise<boolean>
	renameCategory: (oldName: string, newName: string) => void
	deleteCategory: (name: string) => void
	removeSymbolFromCategory: (categoryName: string, symbolId: string) => void
	openSymbolEditor: (symbolId: string) => void
	renameGraphicsSymbol: (oldName: string, newName: string) => void
	deleteGraphicsSymbol: (symbolId: string) => void
	renameSubcircuit: (symbolId: string, newName: string) => void
	deleteSubcircuit: (symbolId: string) => void
	switchToComponentMode: () => void
	cancelComponentPlacement: () => void
	placeComponent: (component: CircuitComponent) => void
	generateSubcircuitPreview: (subcircuitData: any) => Promise<string | null>
	persistCustomSymbol: (customSymbol: DrawerCustomSymbolRecord) => Promise<void>
	reorderSymbolsInCategory: (categoryName: string, orderedIds: string[]) => void
	reorderCategories: (orderedNames: string[]) => void
}

export function createCustomSymbolDrawerActions(deps: CustomSymbolDrawerActionDependencies): CustomSymbolDrawerActions {
	return {
		hideDrawer: deps.hideDrawer,
		openRenameModal: deps.openRenameModal,
		openConfirm: deps.openConfirm,
		renameCategory: deps.renameCategory,
		deleteCategory: deps.deleteCategory,
		removeSymbolFromCategory: deps.removeSymbolFromCategory,
		openSymbolEditor: deps.openSymbolEditor,
		renameGraphicsSymbol: deps.renameGraphicsSymbol,
		deleteGraphicsSymbol: deps.deleteGraphicsSymbol,
		renameSubcircuit: deps.renameSubcircuit,
		deleteSubcircuit: deps.deleteSubcircuit,
		placeStandardSymbol: (standardSymbol: DrawerRuntimeSymbol) => {
			deps.switchToComponentMode()
			deps.cancelComponentPlacement()
			if (standardSymbol.isNodeSymbol) {
				deps.placeComponent(new NodeSymbolComponent(standardSymbol))
			} else {
				deps.placeComponent(new PathSymbolComponent(standardSymbol))
			}
		},
		placeSubcircuit: (customSymbol: DrawerCustomSymbolRecord) => {
			deps.switchToComponentMode()
			deps.cancelComponentPlacement()
			deps.placeComponent(SubcircuitComponent.fromJson(customSymbol.subcircuitData))
		},
		generateSubcircuitPreview: deps.generateSubcircuitPreview,
		persistCustomSymbol: deps.persistCustomSymbol,
		reorderSymbolsInCategory: deps.reorderSymbolsInCategory,
		reorderCategories: deps.reorderCategories,
	}
}
