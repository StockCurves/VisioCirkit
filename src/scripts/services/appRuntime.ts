import { createRuntimeConfig, runtimeConfig, type AppRuntimeConfig } from "../config/runtimeConfig"
import { CustomSymbolApplicationService } from "./customSymbolApplicationService"
import { CustomSymbolDomService } from "./customSymbolDomService"
import { CustomSymbolService } from "./customSymbolService"
import { IndexedDbService } from "./indexedDbService"
import { IndexedDbTemplateDataSource } from "./indexedDbTemplateDataSource"
import { LatexRenderService } from "./latexRenderService"
import { StaticTemplateDataSource } from "./staticTemplateDataSource"
import { SubcircuitPreviewService } from "./subcircuitPreviewService"
import { TabApplicationService } from "./tabApplicationService"
import { TabBroadcastService } from "./tabBroadcastService"
import { TabLifecycleService } from "./tabLifecycleService"
import { TabRepository } from "./tabRepository"
import { TabSessionService } from "./tabSessionService"
import { TemplateApplicationService } from "./templateApplicationService"
import { TemplateFileService } from "./templateFileService"
import type {
	TemplateDataSource,
	TemplateEditorPort,
	TemplateNotifierPort,
} from "./templateTypes"
import { SymbolLibraryService } from "./symbolLibraryService"

export interface AppRuntime {
	readonly config: AppRuntimeConfig
	createTemplateDataSource(): TemplateDataSource
	createTemplateApplicationService(editor: TemplateEditorPort, notifier: TemplateNotifierPort): TemplateApplicationService
	createLatexRenderService(): LatexRenderService
	createIndexedDbService(): IndexedDbService
	createTabRepository<TTabState>(db: IDBDatabase): TabRepository<TTabState>
	createTabSessionService<TData, TSettings>(db: IDBDatabase): TabSessionService<TData, TSettings>
	createTabApplicationService<TData, TSettings>(
		getDb: () => IDBDatabase,
		hasPersistedComponents: (data: TData) => boolean
	): TabApplicationService<TData, TSettings>
	createTabBroadcastService(): TabBroadcastService
	createTabLifecycleService<TData, TSettings>(): TabLifecycleService<TData, TSettings>
	createCustomSymbolApplicationService(getDb: () => IDBDatabase): CustomSymbolApplicationService
	createSymbolLibraryService(): SymbolLibraryService
	createCustomSymbolDomService(): CustomSymbolDomService
	createSubcircuitPreviewService(): SubcircuitPreviewService
	createCustomSymbolService(getDb: () => IDBDatabase): CustomSymbolService
}

class DefaultAppRuntime implements AppRuntime {
	private indexedDbService: IndexedDbService | null = null
	private indexedDbPromise: Promise<IDBDatabase> | null = null
	private customSymbolDomService: CustomSymbolDomService | null = null
	private subcircuitPreviewService: SubcircuitPreviewService | null = null
	private tabBroadcastService: TabBroadcastService | null = null
	private tabLifecycleService: TabLifecycleService<unknown, unknown> | null = null
	private symbolLibraryService: SymbolLibraryService | null = null

	public constructor(public readonly config: AppRuntimeConfig = runtimeConfig) {}

	public createTemplateDataSource(): TemplateDataSource {
		const readonlySource = this.createReadonlyTemplateDataSource()
		if (this.config.storageMode === "indexeddb") {
			return new IndexedDbTemplateDataSource(this.getIndexedDb(), readonlySource)
		}
		return readonlySource
	}

	public createTemplateApplicationService(editor: TemplateEditorPort, notifier: TemplateNotifierPort): TemplateApplicationService {
		return new TemplateApplicationService(this.createTemplateDataSource(), editor, notifier)
	}

	public createLatexRenderService(): LatexRenderService {
		return new LatexRenderService(this.config.apiBase)
	}

	public createIndexedDbService(): IndexedDbService {
		if (!this.indexedDbService) {
			this.indexedDbService = new IndexedDbService()
		}
		return this.indexedDbService
	}

	public createTabRepository<TTabState>(db: IDBDatabase): TabRepository<TTabState> {
		return new TabRepository<TTabState>(db)
	}

	public createTabSessionService<TData, TSettings>(db: IDBDatabase): TabSessionService<TData, TSettings> {
		return new TabSessionService<TData, TSettings>(this.createTabRepository(db))
	}

	public createTabApplicationService<TData, TSettings>(
		getDb: () => IDBDatabase,
		hasPersistedComponents: (data: TData) => boolean
	): TabApplicationService<TData, TSettings> {
		return new TabApplicationService<TData, TSettings>(
			() => this.createTabSessionService<TData, TSettings>(getDb()),
			hasPersistedComponents
		)
	}

	public createTabBroadcastService(): TabBroadcastService {
		if (!this.tabBroadcastService) {
			this.tabBroadcastService = new TabBroadcastService()
		}
		return this.tabBroadcastService
	}

	public createTabLifecycleService<TData, TSettings>(): TabLifecycleService<TData, TSettings> {
		if (!this.tabLifecycleService) {
			this.tabLifecycleService = new TabLifecycleService()
		}
		return this.tabLifecycleService as TabLifecycleService<TData, TSettings>
	}

	public createCustomSymbolApplicationService(getDb: () => IDBDatabase): CustomSymbolApplicationService {
		return new CustomSymbolApplicationService(this.createCustomSymbolService(getDb))
	}

	public createSymbolLibraryService(): SymbolLibraryService {
		if (!this.symbolLibraryService) {
			this.symbolLibraryService = new SymbolLibraryService()
		}
		return this.symbolLibraryService
	}

	public createCustomSymbolDomService(): CustomSymbolDomService {
		if (!this.customSymbolDomService) {
			this.customSymbolDomService = new CustomSymbolDomService()
		}
		return this.customSymbolDomService
	}

	public createSubcircuitPreviewService(): SubcircuitPreviewService {
		if (!this.subcircuitPreviewService) {
			this.subcircuitPreviewService = new SubcircuitPreviewService()
		}
		return this.subcircuitPreviewService
	}

	public createCustomSymbolService(getDb: () => IDBDatabase): CustomSymbolService {
		const previewService = this.createSubcircuitPreviewService()
		return new CustomSymbolService(
			getDb,
			this.createCustomSymbolDomService(),
			(subcircuitData) => previewService.generatePreview(subcircuitData)
		)
	}

	private getIndexedDb(): Promise<IDBDatabase> {
		if (!this.indexedDbPromise) {
			this.indexedDbPromise = this.createIndexedDbService().openDatabase()
		}
		return this.indexedDbPromise
	}

	private createReadonlyTemplateDataSource(): TemplateDataSource {
		if (this.config.templateSource === "static-manifest") {
			return new StaticTemplateDataSource()
		}
		return new TemplateFileService(this.config.apiBase)
	}
}

function createDefaultRuntime() {
	return new DefaultAppRuntime(createRuntimeConfig())
}

let currentRuntime: AppRuntime = createDefaultRuntime()

export function getAppRuntime(): AppRuntime {
	return currentRuntime
}

export function setAppRuntimeForTests(runtime: AppRuntime | null) {
	currentRuntime = runtime ?? createDefaultRuntime()
}
