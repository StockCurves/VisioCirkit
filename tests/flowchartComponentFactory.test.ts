import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => {
	class MockRectangleComponent {
		public displayName = "Rectangle"
		constructor(_createAsText = false) {}
	}

	class MockWireComponent {
		public displayName = "Wire"
		constructor(public straight = false, public endArrow = false) {}
	}

	class MockFlowchartTerminatorComponent {}
	class MockFlowchartDecisionComponent {}
	class MockFlowchartInputOutputComponent {}
	class MockFlowchartDocumentComponent {}
	class MockFlowchartDatabaseComponent {}
	class MockFlowchartSubprocessComponent {}
	class MockFlowchartConnectorComponent {}
	class MockFlowchartOffPageConnectorComponent {}

	return {
		MockRectangleComponent,
		MockWireComponent,
		MockFlowchartTerminatorComponent,
		MockFlowchartDecisionComponent,
		MockFlowchartInputOutputComponent,
		MockFlowchartDocumentComponent,
		MockFlowchartDatabaseComponent,
		MockFlowchartSubprocessComponent,
		MockFlowchartConnectorComponent,
		MockFlowchartOffPageConnectorComponent,
	}
})

vi.mock("../src/scripts/internal", () => ({
	CircuitComponent: class {},
	FlowchartConnectorComponent: mocks.MockFlowchartConnectorComponent,
	FlowchartDatabaseComponent: mocks.MockFlowchartDatabaseComponent,
	FlowchartDecisionComponent: mocks.MockFlowchartDecisionComponent,
	FlowchartDocumentComponent: mocks.MockFlowchartDocumentComponent,
	FlowchartInputOutputComponent: mocks.MockFlowchartInputOutputComponent,
	FlowchartOffPageConnectorComponent: mocks.MockFlowchartOffPageConnectorComponent,
	FlowchartSubprocessComponent: mocks.MockFlowchartSubprocessComponent,
	FlowchartTerminatorComponent: mocks.MockFlowchartTerminatorComponent,
	RectangleComponent: mocks.MockRectangleComponent,
	WireComponent: mocks.MockWireComponent,
}))

import { createFlowchartComponent } from "../src/scripts/components/flowchartComponentFactory"

describe("createFlowchartComponent", () => {
	it("creates the expected component class for each node preset", () => {
		expect(createFlowchartComponent("terminator")).toBeInstanceOf(mocks.MockFlowchartTerminatorComponent)
		expect(createFlowchartComponent("decision")).toBeInstanceOf(mocks.MockFlowchartDecisionComponent)
		expect(createFlowchartComponent("inputOutput")).toBeInstanceOf(mocks.MockFlowchartInputOutputComponent)
		expect(createFlowchartComponent("document")).toBeInstanceOf(mocks.MockFlowchartDocumentComponent)
		expect(createFlowchartComponent("database")).toBeInstanceOf(mocks.MockFlowchartDatabaseComponent)
		expect(createFlowchartComponent("subprocess")).toBeInstanceOf(mocks.MockFlowchartSubprocessComponent)
		expect(createFlowchartComponent("connector")).toBeInstanceOf(mocks.MockFlowchartConnectorComponent)
		expect(createFlowchartComponent("offPageConnector")).toBeInstanceOf(mocks.MockFlowchartOffPageConnectorComponent)
	})

	it("creates process and flow arrow presets with expected defaults", () => {
		const process = createFlowchartComponent("process") as InstanceType<typeof mocks.MockRectangleComponent>
		const flowArrow = createFlowchartComponent("flowArrow") as InstanceType<typeof mocks.MockWireComponent>

		expect(process).toBeInstanceOf(mocks.MockRectangleComponent)
		expect(process.displayName).toBe("Process")
		expect(flowArrow).toBeInstanceOf(mocks.MockWireComponent)
		expect(flowArrow.displayName).toBe("Flow Arrow")
		expect(flowArrow.straight).toBe(false)
		expect(flowArrow.endArrow).toBe(true)
	})
})
