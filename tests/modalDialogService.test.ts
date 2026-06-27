import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("bootstrap", () => ({
	Modal: class {
		public constructor(private readonly element: HTMLElement) {}
		public show() {
			this.element.dispatchEvent(new Event("shown.bs.modal"))
		}
		public hide() {
			this.element.dispatchEvent(new Event("hidden.bs.modal"))
		}
	},
}))

import { ModalDialogService } from "../src/scripts/services/modalDialogService"

describe("ModalDialogService", () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div id="renameModal"></div>
			<input id="renameModalInput" />
			<div id="renameModalLabel"></div>
			<button id="renameModalConfirm"></button>

			<div id="customPromptModal"></div>
			<input id="customPromptModalInput" />
			<div id="customPromptModalLabel"></div>
			<div id="customPromptModalMessage"></div>
			<button id="customPromptModalConfirm"></button>

			<div id="customConfirmModal"></div>
			<div id="customConfirmModalLabel"></div>
			<div id="customConfirmModalMessage"></div>
			<button id="customConfirmModalConfirm"></button>

			<div id="systemMessageModal"></div>
			<div id="systemMessageModalLabel"></div>
			<div id="systemMessageModalMessage"></div>
			<button id="systemMessageModalConfirm"></button>
		`
	})

	it("resolves trimmed prompt input after confirmation", async () => {
		const service = new ModalDialogService()
		const pending = service.openPrompt("Prompt", "Enter value", "  demo  ")
		;(document.getElementById("customPromptModalInput") as HTMLInputElement).value = "  updated  "
		;(document.getElementById("customPromptModalConfirm") as HTMLButtonElement).click()

		await expect(pending).resolves.toBe("updated")
	})

	it("resolves false when confirm modal is dismissed without confirmation", async () => {
		const service = new ModalDialogService()
		const pending = service.openConfirm("Delete", "Proceed?")
		document.getElementById("customConfirmModal")!.dispatchEvent(new Event("hidden.bs.modal"))

		await expect(pending).resolves.toBe(false)
	})
})
