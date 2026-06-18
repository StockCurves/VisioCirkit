import { staticTemplateManifest } from "./generatedTemplateManifest"
import { IndexedDbService } from "./indexedDbService"
import { TemplateDataSource, TemplateDirectory } from "./templateTypes"
import { WorkFileRepository } from "./workFileRepository"

export class LocalTemplateFileService implements TemplateDataSource {
	public constructor(private readonly openDb = () => new IndexedDbService().openDatabase()) {}

	public async listFiles(): Promise<{ templates: string[]; works: string[] }> {
		const repository = await this.getRepository()
		const works = await repository.list()
		return {
			templates: staticTemplateManifest.map((entry) => entry.name),
			works: works.map((record) => record.name).sort((a, b) => a.localeCompare(b)),
		}
	}

	public async readFile(dir: TemplateDirectory, name: string): Promise<string> {
		if (dir === "template") {
			const entry = staticTemplateManifest.find((template) => template.name === name)
			if (!entry) throw new Error("Template not found.")
			const response = await fetch(entry.url)
			if (!response.ok) throw new Error(await response.text())
			return response.text()
		}

		const repository = await this.getRepository()
		const record = await repository.get(name)
		if (!record) throw new Error("Work file not found.")
		return record.content
	}

	public async saveWork(name: string, content: string): Promise<void> {
		const repository = await this.getRepository()
		await repository.put({ name, content, updatedAt: Date.now() })
	}

	public async deleteWork(name: string): Promise<void> {
		const repository = await this.getRepository()
		await repository.delete(name)
	}

	private async getRepository(): Promise<WorkFileRepository> {
		return new WorkFileRepository(await this.openDb())
	}
}
