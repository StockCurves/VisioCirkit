export interface WorkFileRecord {
	name: string
	content: string
	updatedAt: number
}

export class WorkFileRepository {
	public constructor(private readonly db: IDBDatabase) {}

	private requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
		return new Promise((resolve, reject) => {
			request.onsuccess = (event) => resolve(((event.target as IDBRequest<T>)?.result ?? request.result) as T)
			request.onerror = () => reject(request.error)
		})
	}

	private transactionComplete(transaction: IDBTransaction): Promise<void> {
		return new Promise((resolve, reject) => {
			transaction.oncomplete = () => resolve()
			transaction.onerror = () => reject(transaction.error)
			transaction.onabort = () => reject(transaction.error)
		})
	}

	public async list(): Promise<WorkFileRecord[]> {
		const transaction = this.db.transaction("workFiles", "readonly")
		const store = transaction.objectStore("workFiles")
		return (await this.requestToPromise<WorkFileRecord[]>(store.getAll())) || []
	}

	public async get(name: string): Promise<WorkFileRecord | undefined> {
		const transaction = this.db.transaction("workFiles", "readonly")
		const store = transaction.objectStore("workFiles")
		return this.requestToPromise<WorkFileRecord | undefined>(store.get(name))
	}

	public async put(record: WorkFileRecord): Promise<void> {
		const transaction = this.db.transaction("workFiles", "readwrite")
		transaction.objectStore("workFiles").put(record)
		await this.transactionComplete(transaction)
	}

	public async delete(name: string): Promise<void> {
		const transaction = this.db.transaction("workFiles", "readwrite")
		transaction.objectStore("workFiles").delete(name)
		await this.transactionComplete(transaction)
	}
}
