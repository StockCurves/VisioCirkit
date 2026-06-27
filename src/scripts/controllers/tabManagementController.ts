import type { TabManagementSummary } from "../services/tabSessionService"

type TabManagementActions = {
	openTab: (url: string) => void
	deleteTab: (tabId: number) => void
	highlightTab: (tabId: number) => void
	openNewTab: (url: string) => void
}

export class TabManagementController {
	private readonly modalElement: HTMLDivElement
	private readonly tableBody: HTMLTableSectionElement
	private readonly storageUsed: HTMLSpanElement
	private readonly probeRefreshButton: HTMLButtonElement

	public constructor() {
		this.modalElement = document.getElementById("tabManagementModal") as HTMLDivElement
		this.tableBody = document.getElementById("tabManagementTableBody") as HTMLTableSectionElement
		this.storageUsed = document.getElementById("storageUsed") as HTMLSpanElement
		this.probeRefreshButton = document.getElementById("probeRefresh") as HTMLButtonElement
	}

	public onShow(loadSummary: () => void) {
		this.modalElement.addEventListener("show.bs.modal", () => loadSummary())
	}

	public onProbeRefresh(refresh: () => void) {
		this.probeRefreshButton.addEventListener("click", () => refresh())
	}

	public renderSummary(summary: TabManagementSummary, actions: TabManagementActions) {
		this.tableBody.innerHTML = ""

		for (const tabData of summary.entries) {
			const row = this.tableBody.appendChild(document.createElement("tr"))
			row.classList.add("text-end")
			const cell1 = row.appendChild(document.createElement("td"))
			cell1.innerText = tabData.displayName
			const cell2 = row.appendChild(document.createElement("td"))
			cell2.innerText = `${tabData.componentCount}`
			const cell3 = row.appendChild(document.createElement("td"))
			cell3.innerText = this.formatSize(tabData.size)
			const cell4 = row.appendChild(document.createElement("td"))

			if (!tabData.open) {
				const openButton = cell4.appendChild(document.createElement("button"))
				openButton.classList.add("btn", "btn-primary", "me-2")
				openButton.innerText = "Open"
				openButton.addEventListener("click", () => actions.openTab(tabData.openUrl))

				const deleteButton = cell4.appendChild(document.createElement("button"))
				deleteButton.classList.add("btn", "btn-danger", "material-symbols-outlined")
				deleteButton.innerText = "delete"
				deleteButton.addEventListener("click", () => actions.deleteTab(tabData.id))
			} else if (tabData.isCurrent) {
				const infoButton = cell4.appendChild(document.createElement("button"))
				infoButton.classList.add("btn")
				infoButton.innerText = "This tab"
				infoButton.disabled = true
				;[cell1, cell2, cell3, cell4].forEach((cell) => cell.classList.add("bg-primary"))
			} else {
				const highlightButton = cell4.appendChild(document.createElement("button"))
				highlightButton.classList.add("btn", "btn-primary")
				highlightButton.innerText = "Highlight tab"
				highlightButton.addEventListener("click", () => actions.highlightTab(tabData.id))
			}
		}

		const row = this.tableBody.appendChild(document.createElement("tr"))
		const cell = row.appendChild(document.createElement("td"))
		cell.colSpan = 4
		cell.classList.add("text-center")
		const newTabButton = cell.appendChild(document.createElement("button"))
		newTabButton.classList.add("btn", "btn-primary")
		newTabButton.innerText = "New tab"
		newTabButton.addEventListener("click", () => actions.openNewTab(summary.newTabUrl))

		this.storageUsed.innerHTML = this.formatSize(summary.totalSize)
	}

	public requestRefresh() {
		this.modalElement.dispatchEvent(new Event("show.bs.modal"))
	}

	public refreshIfOpen() {
		if (this.modalElement.classList.contains("show")) {
			this.requestRefresh()
		}
	}

	private formatSize(size: number) {
		if (size < 1024) {
			return `${size} B`
		}
		if (size < 1024 * 1024) {
			return `${(size / 1024).toFixed(2)} KB`
		}
		if (size < 1024 * 1024 * 1024) {
			return `${(size / (1024 * 1024)).toFixed(2)} MB`
		}
		return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`
	}
}
