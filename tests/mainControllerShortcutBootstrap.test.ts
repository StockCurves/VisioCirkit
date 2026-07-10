import { beforeEach, describe, expect, it, vi } from "vitest"
import {
	initializeMainControllerShortcutBootstrap,
	type MainControllerShortcutBootstrapDependencies,
} from "../src/scripts/controllers/mainControllerShortcutBootstrap"

describe("mainControllerShortcutBootstrap", () => {
	let handlers: Record<string, () => boolean | void>
	let deps: MainControllerShortcutBootstrapDependencies

	beforeEach(() => {
		handlers = {}
		document.body.innerHTML = `
			<button id="undoButton"></button>
			<button id="redoButton"></button>
			<button id="addComponentButton"></button>
			<button title="Ground"></button>
		`

		deps = {
			registerHotkey: vi.fn((shortcut, handler) => {
				handlers[shortcut] = handler
			}),
			switchToDragPanMode: vi.fn(),
			switchToEraseMode: vi.fn(),
			isComponentPlacementMode: vi.fn(() => false),
			hasSelection: vi.fn(() => false),
			rotatePlacement: vi.fn(),
			rotateSelection: vi.fn(),
			flipPlacement: vi.fn(),
			flipSelection: vi.fn(),
			addUndoState: vi.fn(),
			selectAll: vi.fn(),
			undo: vi.fn(),
			redo: vi.fn(),
			copy: vi.fn(),
			paste: vi.fn(),
			cut: vi.fn(),
			exportSvg: vi.fn(),
			clickAddComponentButton: vi.fn(),
			fitActiveView: vi.fn(),
			placeWireComponent: vi.fn(),
			removeSelection: vi.fn(),
			placeTextComponent: vi.fn(),
			activateShortcutComponent: vi.fn(),
		}
	})

	it("registers core shortcuts and button bindings", () => {
		initializeMainControllerShortcutBootstrap(deps)

		handlers["ctrl+a,command+a"]()
		handlers["ctrl+z,command+z"]()
		handlers["ctrl+y,command+y"]()
		handlers["ctrl+c,command+c"]()
		handlers["ctrl+v,command+v"]()
		handlers["ctrl+x,command+x"]()
		handlers["ctrl+shift+e,command+shift+e"]()
		handlers["q"]()
		handlers["esc"]()
		handlers["f"]()
		handlers["w"]()
		handlers["t"]()
		handlers["2"]()

		;(document.getElementById("undoButton") as HTMLButtonElement).click()
		;(document.getElementById("redoButton") as HTMLButtonElement).click()

		expect(deps.selectAll).toHaveBeenCalled()
		expect(deps.undo).toHaveBeenCalledTimes(2)
		expect(deps.redo).toHaveBeenCalledTimes(2)
		expect(deps.copy).toHaveBeenCalled()
		expect(deps.paste).toHaveBeenCalled()
		expect(deps.cut).toHaveBeenCalled()
		expect(deps.exportSvg).toHaveBeenCalled()
		expect(deps.clickAddComponentButton).toHaveBeenCalled()
		expect(deps.switchToDragPanMode).toHaveBeenCalledTimes(4)
		expect(deps.fitActiveView).toHaveBeenCalled()
		expect(deps.placeWireComponent).toHaveBeenCalled()
		expect(deps.placeTextComponent).toHaveBeenCalledTimes(2)
	})

	it("routes rotate/flip/delete behavior based on mode and selection state", () => {
		let componentMode = true
		let hasSelection = false
		deps.isComponentPlacementMode = vi.fn(() => componentMode)
		deps.hasSelection = vi.fn(() => hasSelection)

		initializeMainControllerShortcutBootstrap(deps)

		handlers["ctrl+r,command+r"]()
		handlers["ctrl+shift+r,command+shift+r"]()
		handlers["shift+x"]()
		handlers["shift+y"]()
		handlers["shift+h"]()
		handlers["shift+v"]()
		expect(deps.rotatePlacement).toHaveBeenCalledWith(-90)
		expect(deps.rotatePlacement).toHaveBeenCalledWith(90)
		expect(deps.flipPlacement).toHaveBeenCalledWith(true)
		expect(deps.flipPlacement).toHaveBeenCalledWith(false)

		componentMode = false
		hasSelection = true
		handlers["ctrl+r,command+r"]()
		handlers["shift+x"]()
		handlers["shift+h"]()
		handlers["shift+v"]()
		handlers["del, backspace"]()
		expect(deps.rotateSelection).toHaveBeenCalledWith(-90)
		expect(deps.flipSelection).toHaveBeenCalledWith(true)
		expect(deps.flipSelection).toHaveBeenCalledWith(false)
		expect(deps.removeSelection).toHaveBeenCalled()
		expect(deps.addUndoState).toHaveBeenCalled()

		hasSelection = false
		handlers["del, backspace"]()
		expect(deps.switchToEraseMode).toHaveBeenCalled()
	})

	it("registers component placement shortcuts through component titles", () => {
		initializeMainControllerShortcutBootstrap(deps)

		handlers["g"]()
		expect(deps.switchToDragPanMode).toHaveBeenCalled()
		expect(deps.activateShortcutComponent).toHaveBeenCalledWith("Ground")

		handlers["p"]()
		handlers["1"]()
		handlers["3"]()
		handlers["4"]()
		handlers["5"]()
		handlers["6"]()
		expect(deps.activateShortcutComponent).toHaveBeenCalledWith("PMOS")
		expect(deps.activateShortcutComponent).toHaveBeenCalledWith("Straight line")
		expect(deps.activateShortcutComponent).toHaveBeenCalledWith("Straight arrow")
		expect(deps.activateShortcutComponent).toHaveBeenCalledWith("Connected terminal")
		expect(deps.activateShortcutComponent).toHaveBeenCalledWith("Rectangle/Text")
		expect(deps.activateShortcutComponent).toHaveBeenCalledWith("Ellipse")
	})
})
