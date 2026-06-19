import { TabSessionService, type TabManagementSummary, type TabSnapshot } from "./tabSessionService"

export class TabApplicationService<TData, TSettings> {
	public constructor(
		private readonly getSessionService: () => TabSessionService<TData, TSettings>,
		private readonly hasPersistedComponents: (data: TData) => boolean
	) {}

	public initializeTab(requestedId: number | undefined, defaultData: TData, defaultSettings: TSettings) {
		return this.getSessionService().initializeTab(requestedId, defaultData, defaultSettings)
	}

	public updateDesignName(tabId: number, designName?: string) {
		return this.getSessionService().updateDesignName(tabId, designName)
	}

	public getTabManagementSummary(
		currentTabId: number,
		measureSize: (data: TData) => number,
		countComponents: (data: TData) => number
	): Promise<TabManagementSummary> {
		return this.getSessionService().getTabManagementSummary(currentTabId, measureSize, countComponents)
	}

	public deleteTab(tabId: number) {
		return this.getSessionService().deleteTab(tabId)
	}

	public markOtherTabsClosedForProbe(currentTabId: number) {
		return this.getSessionService().markOtherTabsClosedForProbe(currentTabId, this.hasPersistedComponents)
	}

	public markTabOpen(tabId: number) {
		return this.getSessionService().markTabOpen(tabId)
	}

	public persistSnapshot(tabId: number, snapshot: TabSnapshot<TData, TSettings>, closeTab: boolean) {
		return this.getSessionService().persistSnapshot(tabId, snapshot, closeTab, this.hasPersistedComponents)
	}
}
