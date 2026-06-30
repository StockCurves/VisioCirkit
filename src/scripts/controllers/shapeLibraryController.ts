import * as SVG from "@svgdotjs/svg.js"
import {
	CircuitComponent,
	EllipseComponent,
	OpenComponent,
	PolygonComponent,
	RectangleComponent,
	ShortComponent,
	WireComponent,
	defaultStroke,
} from "../internal"
import { createFlowchartComponent } from "../components/flowchartComponentFactory"

export type ShapeLibraryCallbacks = {
	hideDrawer: () => void
	switchToPanMode: () => void
	switchToComponentMode: () => void
	cancelComponentPlacement: () => void
	placeComponent: (component: CircuitComponent) => void
}

export class ShapeLibraryController {
	public render(leftOffcanvasAccordion: HTMLDivElement, callbacks: ShapeLibraryCallbacks): void {
		const basicGroup = this.createAccordionGroup(leftOffcanvasAccordion, "Basic")
		this.addShortButton(basicGroup, callbacks)
		this.addOpenButton(basicGroup, callbacks)
		this.addTextButton(basicGroup, callbacks)
		this.addRectangleButton(basicGroup, callbacks)
		this.addEllipseButton(basicGroup, callbacks)
		this.addPolygonButton(basicGroup, callbacks)
		this.addStraightLineButton(basicGroup, callbacks)
		this.addStraightArrowButton(basicGroup, callbacks)
		this.addArrowButton(basicGroup, callbacks)

		const flowchartGroup = this.createAccordionGroup(leftOffcanvasAccordion, "Flowchart")
		this.addFlowchartTerminatorButton(flowchartGroup, callbacks)
		this.addFlowchartProcessButton(flowchartGroup, callbacks)
		this.addFlowchartDecisionButton(flowchartGroup, callbacks)
		this.addFlowchartInputOutputButton(flowchartGroup, callbacks)
		this.addFlowchartArrowButton(flowchartGroup, callbacks)
		this.addFlowchartDocumentButton(flowchartGroup, callbacks)
		this.addFlowchartDatabaseButton(flowchartGroup, callbacks)
		this.addFlowchartSubprocessButton(flowchartGroup, callbacks)
		this.addFlowchartConnectorButton(flowchartGroup, callbacks)
		this.addFlowchartOffPageConnectorButton(flowchartGroup, callbacks)
	}

	private createAccordionGroup(parent: HTMLDivElement, groupName: string): HTMLDivElement {
		const collapseGroupID = "collapseGroup-" + groupName.replace(/[^\d\w\-\_]+/gi, "-")

		const accordionGroup = parent.appendChild(document.createElement("div"))
		accordionGroup.classList.add("accordion-item")

		const accordionItemHeader = accordionGroup.appendChild(document.createElement("h2"))
		accordionItemHeader.classList.add("accordion-header")

		const accordionItemButton = accordionItemHeader.appendChild(document.createElement("button"))
		accordionItemButton.classList.add("accordion-button")
		accordionItemButton.innerText = groupName
		accordionItemButton.setAttribute("aria-controls", collapseGroupID)
		accordionItemButton.setAttribute("aria-expanded", "true")
		accordionItemButton.setAttribute("data-bs-target", "#" + collapseGroupID)
		accordionItemButton.setAttribute("data-bs-toggle", "collapse")
		accordionItemButton.type = "button"

		const accordionItemCollapse = accordionGroup.appendChild(document.createElement("div"))
		accordionItemCollapse.classList.add("accordion-collapse", "collapse", "show")
		accordionItemCollapse.id = collapseGroupID
		accordionItemCollapse.setAttribute("data-bs-parent", "#leftOffcanvasAccordion")

		const accordionItemBody = accordionItemCollapse.appendChild(document.createElement("div"))
		accordionItemBody.classList.add("accordion-body", "iconLibAccordionBody")
		return accordionItemBody
	}

	private addShortButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "short path", "Short")
		addButton.addEventListener("mouseup", (ev) => {
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(new ShortComponent())
			callbacks.hideDrawer()
		})
		addButton.addEventListener("touchstart", (ev) => {
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(new ShortComponent())
			callbacks.hideDrawer()
		}, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(-1, -14, 30, 15)
		svgIcon.line(0, -7, 29, -7).stroke({ color: defaultStroke, width: 2 })
	}

	private addOpenButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "open path", "Open")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(new OpenComponent())
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(-1, -14, 30, 15)
		svgIcon.circle(5).fill("none").stroke({ color: defaultStroke, width: 1 }).center(4, -7)
		svgIcon.circle(5).fill("none").stroke({ color: defaultStroke, width: 1 }).center(25, -7)
	}

	private addTextButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "text node", "Text")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(new RectangleComponent(true))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(-1, -14, 30, 15)
		svgIcon.text((add) => {
			add.tspan("Text").fill({ color: defaultStroke })
		})
	}

	private addRectangleButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "rect rectangle node", "Rectangle/Text")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(new RectangleComponent(false))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 17, 12)
		svgIcon.rect(15, 10).move(1, 1).fill("none").stroke({ color: defaultStroke, width: 1 })
	}

	private addEllipseButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "ellipse circle node", "Ellipse")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToComponentMode()
			callbacks.cancelComponentPlacement()
			callbacks.placeComponent(new EllipseComponent())
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 17, 12)
		svgIcon.ellipse(15, 10).move(1, 1).fill("none").stroke({ color: defaultStroke, width: 1 })
	}

	private addPolygonButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "polygon path", "Polygon")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToComponentMode()
			callbacks.cancelComponentPlacement()
			callbacks.placeComponent(new PolygonComponent())
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 17, 12)
		svgIcon
			.polygon([
				[1, 1],
				[16, 1],
				[15, 11],
				[11, 9],
				[5, 11],
			])
			.fill("none")
			.stroke({ color: defaultStroke, width: 1 })
	}

	private addStraightLineButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "straight line path", "Straight line")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(new WireComponent(true))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 17, 12)
		svgIcon.line(2, 10, 15, 2).stroke({ color: defaultStroke, width: 1, opacity: 1 })
	}

	private addStraightArrowButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "straight arrow path", "Straight arrow")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(new WireComponent(true, true))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(-1, -1, 12, 6)
		svgIcon
			.polygon([
				[6, 0],
				[10, 2],
				[6, 4],
				[6, 2.2],
				[0, 2.2],
				[0, 1.8],
				[6, 1.8],
			])
			.rotate(-30, 5, 2)
			.fill({ color: defaultStroke })
	}

	private addArrowButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "arrow path", "Arrow")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(new WireComponent(false, true))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(-1, -2, 12, 8)
		svgIcon
			.polyline([
				[0, 5],
				[5, 5],
				[5, 0],
				[9.1, 0],
			])
			.stroke({ color: defaultStroke, width: 0.5 })
			.fill("none")
		svgIcon
			.polygon([
				[9, -1],
				[10.5, 0],
				[9, 1],
			])
			.fill({ color: defaultStroke })
	}

	private addFlowchartTerminatorButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart terminator start end rounded rectangle", "Start / End")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("terminator"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon.rect(16, 10).move(1, 1).radius(5).fill("none").stroke({ color: defaultStroke, width: 1 })
	}

	private addFlowchartProcessButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart process rectangle step", "Process")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("process"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon.rect(16, 10).move(1, 1).fill("none").stroke({ color: defaultStroke, width: 1 })
	}

	private addFlowchartDecisionButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart decision diamond branch yes no", "Decision")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("decision"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon
			.polygon([
				[9, 1],
				[17, 6],
				[9, 11],
				[1, 6],
			])
			.fill("none")
			.stroke({ color: defaultStroke, width: 1 })
	}

	private addFlowchartInputOutputButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart input output parallelogram io data", "Input / Output")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("inputOutput"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon
			.polygon([
				[4, 1],
				[17, 1],
				[14, 11],
				[1, 11],
			])
			.fill("none")
			.stroke({ color: defaultStroke, width: 1 })
	}

	private addFlowchartArrowButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart arrow connector line", "Flow Arrow")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("flowArrow"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(-1, -2, 12, 8)
		svgIcon
			.polyline([
				[0, 5],
				[5, 5],
				[5, 0],
				[9.1, 0],
			])
			.stroke({ color: defaultStroke, width: 0.5 })
			.fill("none")
		svgIcon
			.polygon([
				[9, -1],
				[10.5, 0],
				[9, 1],
			])
			.fill({ color: defaultStroke })
	}

	private addFlowchartDocumentButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart document file report page", "Document")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("document"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon
			.path("M 1 1 L 17 1 L 17 9 C 15 10.5, 12.5 11.2, 9 10.1 C 6 9.2, 3.5 10.2, 1 11 Z")
			.fill("none")
			.stroke({ color: defaultStroke, width: 1 })
	}

	private addFlowchartDatabaseButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart database storage cylinder data", "Database")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("database"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon
			.path("M 1 3 C 1 1.8, 4.6 1, 9 1 C 13.4 1, 17 1.8, 17 3 L 17 9 C 17 10.2, 13.4 11, 9 11 C 4.6 11, 1 10.2, 1 9 Z M 1 3 C 1 4.2, 4.6 5, 9 5 C 13.4 5, 17 4.2, 17 3")
			.fill("none")
			.stroke({ color: defaultStroke, width: 1 })
	}

	private addFlowchartSubprocessButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart subprocess predefined process routine", "Subprocess")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("subprocess"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon.rect(16, 10).move(1, 1).fill("none").stroke({ color: defaultStroke, width: 1 })
		svgIcon.line(4, 2, 4, 10).stroke({ color: defaultStroke, width: 1 })
		svgIcon.line(14, 2, 14, 10).stroke({ color: defaultStroke, width: 1 })
	}

	private addFlowchartConnectorButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(parent, "flowchart connector circle jump point", "Connector")
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("connector"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon.circle(10).center(9, 6).fill("none").stroke({ color: defaultStroke, width: 1 })
	}

	private addFlowchartOffPageConnectorButton(parent: HTMLDivElement, callbacks: ShapeLibraryCallbacks) {
		const addButton = this.createButton(
			parent,
			"flowchart off page connector pentagon continuation",
			"Off-page Connector"
		)
		const listener = (ev: MouseEvent) => {
			if (ev.button !== 0) return
			ev.preventDefault()
			callbacks.switchToPanMode()
			callbacks.placeComponent(createFlowchartComponent("offPageConnector"))
			callbacks.hideDrawer()
		}
		addButton.addEventListener("mouseup", listener)
		addButton.addEventListener("touchstart", listener, { passive: false })

		const svgIcon = SVG.SVG().addTo(addButton)
		svgIcon.viewbox(0, 0, 18, 12)
		svgIcon
			.polygon([
				[3, 1],
				[15, 1],
				[17, 7],
				[9, 11],
				[1, 7],
			])
			.fill("none")
			.stroke({ color: defaultStroke, width: 1 })
	}

	private createButton(parent: HTMLDivElement, searchData: string, title: string): HTMLDivElement {
		const addButton: HTMLDivElement = parent.appendChild(document.createElement("div"))
		addButton.classList.add("libComponent")
		addButton.setAttribute("searchData", searchData)
		addButton.ariaRoleDescription = "button"
		addButton.title = title
		return addButton
	}
}
