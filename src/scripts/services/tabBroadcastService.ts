export type BroadcastMessageType = "show" | "update" | "clipboard" | "probe" | "probe-response"

export type BroadcastMessage = {
	type: BroadcastMessageType
	from: number
	payload?: any
}

export type BroadcastReaction = {
	flashCurrentTab?: boolean
	refreshTabManagement?: boolean
	clipboardPayload?: any
	outgoingMessage?: BroadcastMessage
}

export class TabBroadcastService {
	public createMessage(type: BroadcastMessageType, from: number, payload?: any): BroadcastMessage {
		const message: BroadcastMessage = { type, from }
		if (payload != undefined) {
			message.payload = payload
		}
		return message
	}

	public async handleIncomingMessage(
		message: BroadcastMessage,
		currentTabId: number,
		markTabOpen: (tabId: number) => Promise<boolean>
	): Promise<BroadcastReaction> {
		if (message.type === "show") {
			return { flashCurrentTab: parseInt(message.payload) === currentTabId }
		}

		if (message.type === "update") {
			return { refreshTabManagement: true }
		}

		if (message.type === "clipboard") {
			return { clipboardPayload: message.payload }
		}

		if (message.type === "probe") {
			return {
				outgoingMessage: this.createMessage("probe-response", currentTabId, message.from),
			}
		}

		if (message.type === "probe-response") {
			if (message.payload != currentTabId) {
				return {}
			}

			const updated = await markTabOpen(message.from)
			return {
				refreshTabManagement: true,
				outgoingMessage: updated ? this.createMessage("update", currentTabId) : undefined,
			}
		}

		return {}
	}
}
