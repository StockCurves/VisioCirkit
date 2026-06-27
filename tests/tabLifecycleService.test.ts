import { describe, expect, it, vi } from "vitest"
import { TabLifecycleService } from "../src/scripts/services/tabLifecycleService"

describe("TabLifecycleService", () => {
	it("clears legacy local and session storage keys", () => {
		const service = new TabLifecycleService()
		const storage = { removeItem: vi.fn() } as unknown as Storage
		const sessionStorage = { removeItem: vi.fn() } as unknown as Storage

		service.clearLegacyStorage(storage, sessionStorage)

		expect(storage.removeItem).toHaveBeenCalledWith("currentProgress")
		expect(storage.removeItem).toHaveBeenCalledWith("circuit2tikz-designer-grid")
		expect(storage.removeItem).toHaveBeenCalledWith("circuitikz-designer-grid")
		expect(storage.removeItem).toHaveBeenCalledWith("circuitikz-designer-saveState")
		expect(sessionStorage.removeItem).toHaveBeenCalledWith("circuitikz-designer-tabID")
	})

	it("binds browser lifecycle events to background and unload saves", () => {
		const service = new TabLifecycleService()
		const listeners = new Map<string, EventListener>()
		const saveCurrentState = vi.fn()
		const targetWindow = {
			addEventListener: vi.fn((type: string, listener: EventListener) => listeners.set(type, listener)),
		} as unknown as Window
		const targetDocument = { visibilityState: "visible" } as Document

		service.bindPersistenceHandlers(targetWindow, targetDocument, saveCurrentState)

		;(targetDocument as any).visibilityState = "hidden"
		listeners.get("visibilitychange")!(new Event("visibilitychange"))
		listeners.get("beforeunload")!(new Event("beforeunload"))

		expect(saveCurrentState).toHaveBeenNthCalledWith(1, false)
		expect(saveCurrentState).toHaveBeenNthCalledWith(2, true)
	})

	it("initializes the current tab from the URL query and applies the session", async () => {
		const service = new TabLifecycleService<{ components: unknown[] }, { gridVisible?: boolean }>()
		const initializeTab = vi.fn().mockResolvedValue({
			tabId: 4,
			openedExisting: true,
			pendingData: { components: [1] },
			settings: { gridVisible: true },
			designName: "Draft",
		})
		const applySession = vi.fn()

		const session = await service.initializeCurrentTab(
			"https://example.com/?tabID=4",
			{ components: [] },
			{},
			initializeTab,
			applySession
		)

		expect(initializeTab).toHaveBeenCalledWith(4, { components: [] }, {})
		expect(applySession).toHaveBeenCalledWith(session)
		expect(session.tabId).toBe(4)
	})
})
