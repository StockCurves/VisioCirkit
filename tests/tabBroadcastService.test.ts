import { describe, expect, it, vi } from "vitest"
import { TabBroadcastService } from "../src/scripts/services/tabBroadcastService"

describe("TabBroadcastService", () => {
	it("responds to probe messages without controller-local branching", async () => {
		const service = new TabBroadcastService()

		const reaction = await service.handleIncomingMessage({ type: "probe", from: 7 }, 3, vi.fn())

		expect(reaction).toEqual({
			outgoingMessage: { type: "probe-response", from: 3, payload: 7 },
		})
	})

	it("marks tabs open only for matching probe responses and emits update when changed", async () => {
		const service = new TabBroadcastService()
		const markTabOpen = vi.fn().mockResolvedValue(true)

		const reaction = await service.handleIncomingMessage({ type: "probe-response", from: 9, payload: 3 }, 3, markTabOpen)

		expect(markTabOpen).toHaveBeenCalledWith(9)
		expect(reaction).toEqual({
			refreshTabManagement: true,
			outgoingMessage: { type: "update", from: 3 },
		})
	})

	it("ignores probe responses that belong to another tab", async () => {
		const service = new TabBroadcastService()
		const markTabOpen = vi.fn()

		const reaction = await service.handleIncomingMessage({ type: "probe-response", from: 9, payload: 4 }, 3, markTabOpen)

		expect(markTabOpen).not.toHaveBeenCalled()
		expect(reaction).toEqual({})
	})
})
