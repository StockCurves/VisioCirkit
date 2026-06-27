import { beforeEach, describe, expect, it, vi } from "vitest"
import { TabManagementController } from "../src/scripts/controllers/tabManagementController"

describe("TabManagementController", () => {
	beforeEach(() => {
		document.body.innerHTML = `
			<div id="tabManagementModal" class="show"></div>
			<table><tbody id="tabManagementTableBody"></tbody></table>
			<span id="storageUsed"></span>
			<button id="probeRefresh"></button>
		`
	})

	it("renders tab rows and action buttons outside MainController", () => {
		const controller = new TabManagementController()
		const openTab = vi.fn()
		const deleteTab = vi.fn()
		const highlightTab = vi.fn()
		const openNewTab = vi.fn()

		controller.renderSummary(
			{
				entries: [
					{ id: 1, displayName: "draft", componentCount: 2, size: 2048, open: false, isCurrent: false, openUrl: ".?tabID=1" },
					{ id: 2, displayName: "current", componentCount: 3, size: 512, open: true, isCurrent: true, openUrl: "." },
					{ id: 3, displayName: "peer", componentCount: 1, size: 128, open: true, isCurrent: false, openUrl: "." },
				],
				totalSize: 2688,
				newTabUrl: ".",
			},
			{ openTab, deleteTab, highlightTab, openNewTab }
		)

		const buttons = Array.from(document.querySelectorAll("button"))
		expect(document.getElementById("storageUsed")!.textContent).toBe("2.63 KB")
		expect(document.querySelectorAll("#tabManagementTableBody tr")).toHaveLength(4)
		expect(buttons.some((button) => (button as HTMLButtonElement).innerText === "This tab" && button.hasAttribute("disabled"))).toBe(true)
		expect(buttons.some((button) => (button as HTMLButtonElement).innerText === "Highlight tab")).toBe(true)

		buttons.find((button) => (button as HTMLButtonElement).innerText === "Open")!.click()
		buttons.find((button) => (button as HTMLButtonElement).innerText === "delete")!.click()
		buttons.find((button) => (button as HTMLButtonElement).innerText === "Highlight tab")!.click()
		buttons.find((button) => (button as HTMLButtonElement).innerText === "New tab")!.click()

		expect(openTab).toHaveBeenCalledWith(".?tabID=1")
		expect(deleteTab).toHaveBeenCalledWith(1)
		expect(highlightTab).toHaveBeenCalledWith(3)
		expect(openNewTab).toHaveBeenCalledWith(".")
	})

	it("refreshes the modal only when it is currently open", () => {
		const controller = new TabManagementController()
		const modal = document.getElementById("tabManagementModal")!
		const events: string[] = []
		modal.addEventListener("show.bs.modal", () => events.push("show"))

		controller.refreshIfOpen()
		modal.classList.remove("show")
		controller.refreshIfOpen()

		expect(events).toEqual(["show"])
	})
})
