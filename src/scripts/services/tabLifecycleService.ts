import type { TabInitializationResult } from "./tabSessionService"

export class TabLifecycleService<TData, TSettings> {
	public clearLegacyStorage(storage: Storage, sessionStorage: Storage) {
		storage.removeItem("currentProgress")
		storage.removeItem("circuit2tikz-designer-grid")
		storage.removeItem("circuitikz-designer-grid")
		storage.removeItem("circuitikz-designer-saveState")
		sessionStorage.removeItem("circuitikz-designer-tabID")
	}

	public bindPersistenceHandlers(
		targetWindow: Window,
		targetDocument: Document,
		saveCurrentState: (closeTab?: boolean) => void
	) {
		targetWindow.addEventListener("visibilitychange", () => {
			if (targetDocument.visibilityState == "hidden") {
				saveCurrentState(false)
			}
		})

		targetWindow.addEventListener("beforeunload", () => {
			saveCurrentState(true)
		})
	}

	public async initializeCurrentTab(
		locationHref: string,
		defaultData: TData,
		defaultSettings: TSettings,
		initializeTab: (
			requestedId: number | undefined,
			defaultData: TData,
			defaultSettings: TSettings
		) => Promise<TabInitializationResult<TData, TSettings>>,
		applySession: (session: TabInitializationResult<TData, TSettings>) => void
	) {
		const url = new URL(locationHref)
		const requestedId = parseInt(url.searchParams.get("tabID"))
		const session = await initializeTab(requestedId, defaultData, defaultSettings)
		applySession(session)
		return session
	}
}
