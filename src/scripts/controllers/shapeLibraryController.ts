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

export type ShapeLibraryCallbacks = {
	hideDrawer: () => void
	switchToPanMode: () => void
	switchToComponentMode: () => void
	cancelComponentPlacement: () => void
	placeComponent: (component: CircuitComponent) => void
}

export class ShapeLibraryController {
	public render(leftOffcanvasAccordion: HTMLDivElement, callbacks: ShapeLibraryCallbacks): void {
		const groupName = "Basic"
		const collapseGroupID = "collapseGroup-" + groupName.replace(/[^\d\w\-\_]+/gi, "-")

		const accordionGroup = leftOffcanvasAccordion.appendChild(document.createElement("div"))
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

		this.addShortButton(accordionItemBody, callbacks)
		this.addOpenButton(accordionItemBody, callbacks)
		this.addTextButton(accordionItemBody, callbacks)
		this.addRectangleButton(accordionItemBody, callbacks)
		this.addEllipseButton(accordionItemBody, callbacks)
		this.addPolygonButton(accordionItemBody, callbacks)
		this.addStraightLineButton(accordionItemBody, callbacks)
		this.addStraightArrowButton(accordionItemBody, callbacks)
		this.addArrowButton(accordionItemBody, callbacks)
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

	private createButton(parent: HTMLDivElement, searchData: string, title: string): HTMLDivElement {
		const addButton: HTMLDivElement = parent.appendChild(document.createElement("div"))
		addButton.classList.add("libComponent")
		addButton.setAttribute("searchData", searchData)
		addButton.ariaRoleDescription = "button"
		addButton.title = title
		return addButton
	}
}
