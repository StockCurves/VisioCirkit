import { Modal } from "bootstrap"

export class ModalDialogService {
	public openRenameModal(title: string, currentName: string): Promise<string | null> {
		return new Promise((resolve) => {
			const modalEl = document.getElementById("renameModal") as HTMLDivElement
			const input = document.getElementById("renameModalInput") as HTMLInputElement
			const label = document.getElementById("renameModalLabel") as HTMLElement
			const confirmBtn = document.getElementById("renameModalConfirm") as HTMLButtonElement

			label.textContent = title
			input.value = currentName

			const bsModal = new Modal(modalEl)
			let isConfirmed = false
			let resolvedValue: string | null = null

			const cleanup = () => {
				confirmBtn.removeEventListener("click", onConfirm)
				input.removeEventListener("keydown", onKeydown)
				modalEl.removeEventListener("hidden.bs.modal", onDismiss)
			}
			const onConfirm = () => {
				resolvedValue = input.value.trim() || null
				isConfirmed = true
				bsModal.hide()
			}
			const onDismiss = () => {
				cleanup()
				resolve(isConfirmed ? resolvedValue : null)
			}
			const onKeydown = (ev: KeyboardEvent) => {
				if (ev.key === "Enter") onConfirm()
			}

			confirmBtn.addEventListener("click", onConfirm)
			input.addEventListener("keydown", onKeydown)
			modalEl.addEventListener("hidden.bs.modal", onDismiss, { once: true })
			modalEl.addEventListener("shown.bs.modal", () => { input.focus(); input.select() }, { once: true })

			bsModal.show()
		})
	}

	public openPrompt(title: string, message: string, defaultValue = ""): Promise<string | null> {
		return new Promise((resolve) => {
			const modalEl = document.getElementById("customPromptModal") as HTMLDivElement
			const input = document.getElementById("customPromptModalInput") as HTMLInputElement
			const label = document.getElementById("customPromptModalLabel") as HTMLElement
			const messageEl = document.getElementById("customPromptModalMessage") as HTMLElement
			const confirmBtn = document.getElementById("customPromptModalConfirm") as HTMLButtonElement

			label.textContent = title
			messageEl.textContent = message
			input.value = defaultValue

			const bsModal = new Modal(modalEl)
			let isConfirmed = false
			let resolvedValue: string | null = null

			const cleanup = () => {
				confirmBtn.removeEventListener("click", onConfirm)
				input.removeEventListener("keydown", onKeydown)
				modalEl.removeEventListener("hidden.bs.modal", onDismiss)
			}
			const onConfirm = () => {
				resolvedValue = input.value.trim() || null
				isConfirmed = true
				bsModal.hide()
			}
			const onDismiss = () => {
				cleanup()
				resolve(isConfirmed ? resolvedValue : null)
			}
			const onKeydown = (ev: KeyboardEvent) => {
				if (ev.key === "Enter") onConfirm()
			}

			confirmBtn.addEventListener("click", onConfirm)
			input.addEventListener("keydown", onKeydown)
			modalEl.addEventListener("hidden.bs.modal", onDismiss, { once: true })
			modalEl.addEventListener("shown.bs.modal", () => { input.focus(); input.select() }, { once: true })

			bsModal.show()
		})
	}

	public openConfirm(title: string, message: string): Promise<boolean> {
		return new Promise((resolve) => {
			const modalEl = document.getElementById("customConfirmModal") as HTMLDivElement
			const label = document.getElementById("customConfirmModalLabel") as HTMLElement
			const messageEl = document.getElementById("customConfirmModalMessage") as HTMLElement
			const confirmBtn = document.getElementById("customConfirmModalConfirm") as HTMLButtonElement

			label.textContent = title
			messageEl.textContent = message

			const bsModal = new Modal(modalEl)
			let isConfirmed = false

			const cleanup = () => {
				confirmBtn.removeEventListener("click", onConfirm)
				modalEl.removeEventListener("hidden.bs.modal", onDismiss)
			}
			const onConfirm = () => {
				isConfirmed = true
				bsModal.hide()
			}
			const onDismiss = () => {
				cleanup()
				resolve(isConfirmed)
			}

			confirmBtn.addEventListener("click", onConfirm)
			modalEl.addEventListener("hidden.bs.modal", onDismiss, { once: true })

			bsModal.show()
		})
	}

	public openAlert(title: string, message: string): Promise<void> {
		return new Promise((resolve) => {
			const modalEl = document.getElementById("systemMessageModal") as HTMLDivElement
			const label = document.getElementById("systemMessageModalLabel") as HTMLElement
			const messageEl = document.getElementById("systemMessageModalMessage") as HTMLElement
			const confirmBtn = document.getElementById("systemMessageModalConfirm") as HTMLButtonElement

			label.textContent = title
			messageEl.textContent = message

			const bsModal = new Modal(modalEl)

			const cleanup = () => {
				confirmBtn.removeEventListener("click", onConfirm)
				modalEl.removeEventListener("hidden.bs.modal", onDismiss)
			}
			const onConfirm = () => bsModal.hide()
			const onDismiss = () => {
				cleanup()
				resolve()
			}

			confirmBtn.addEventListener("click", onConfirm)
			modalEl.addEventListener("hidden.bs.modal", onDismiss, { once: true })

			bsModal.show()
		})
	}
}
