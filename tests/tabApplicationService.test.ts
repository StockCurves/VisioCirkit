import { describe, expect, it, vi } from "vitest"
import { TabApplicationService } from "../src/scripts/services/tabApplicationService"

describe("TabApplicationService", () => {
	it("delegates probe cleanup and snapshot persistence through a shared persistence rule", async () => {
		const sessionService = {
			markOtherTabsClosedForProbe: vi.fn().mockResolvedValue(undefined),
			persistSnapshot: vi.fn().mockResolvedValue("updated"),
		}
		const service = new TabApplicationService(
			() => sessionService as any,
			(data: { components: unknown[] }) => data.components.length > 0
		)

		await service.markOtherTabsClosedForProbe(3)
		await service.persistSnapshot(3, { data: { components: [1] }, settings: { gridVisible: true }, designName: "Draft" }, false)

		expect(sessionService.markOtherTabsClosedForProbe).toHaveBeenCalledWith(3, expect.any(Function))
		expect(sessionService.persistSnapshot).toHaveBeenCalledWith(
			3,
			{ data: { components: [1] }, settings: { gridVisible: true }, designName: "Draft" },
			false,
			expect.any(Function)
		)

		const hasPersistedComponents = sessionService.persistSnapshot.mock.calls[0][3]
		expect(hasPersistedComponents({ components: [] })).toBe(false)
		expect(hasPersistedComponents({ components: [1] })).toBe(true)
	})
})
