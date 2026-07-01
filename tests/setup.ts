import { vi } from "vitest"

const pxPerUnit: Record<string, number> = {
	"": 1,
	px: 1,
	in: 96,
	cm: 4800 / 127,
	mm: 480 / 127,
	pt: 4 / 3,
	pc: 16,
	"%": 1,
}

export class FakeNumber {
	value: number
	unit: string

	constructor(value: any = 0, unit = "") {
		if (value instanceof FakeNumber) {
			this.value = value.value
			this.unit = value.unit
			return
		}
		if (typeof value === "object" && value !== null) {
			this.value = Number(value.value ?? 0)
			this.unit = String(value.unit ?? unit)
			return
		}
		const match = String(value).trim().match(/^(-?\d+(?:\.\d+)?)([a-z%]*)$/i)
		this.value = match ? Number(match[1]) : Number(value) || 0
		this.unit = unit || match?.[2] || ""
	}

	convertToUnit(unit: "px" | "in" | "cm" | "mm" | "pt" | "pc"): FakeNumber {
		const px = this.value * (pxPerUnit[this.unit] ?? 1)
		return new FakeNumber(px / (pxPerUnit[unit] ?? 1), unit)
	}

	plus(other: FakeNumber | number): FakeNumber {
		const rhs = other instanceof FakeNumber ? other.convertToUnit((this.unit || "px") as any).value : other
		return new FakeNumber(this.value + rhs, this.unit)
	}

	minus(other: FakeNumber | number): FakeNumber {
		const rhs = other instanceof FakeNumber ? other.convertToUnit((this.unit || "px") as any).value : other
		return new FakeNumber(this.value - rhs, this.unit)
	}

	times(other: FakeNumber | number): FakeNumber {
		const rhs = other instanceof FakeNumber ? other.value : other
		return new FakeNumber(this.value * rhs, this.unit)
	}

	divide(other: FakeNumber | number): FakeNumber {
		const rhs = other instanceof FakeNumber ? other.value : other
		return new FakeNumber(this.value / rhs, this.unit)
	}

	toString(): string {
		return `${this.value}${this.unit}`
	}
}

export class FakePoint {
	x: number
	y: number

	constructor(x: any = 0, y?: number) {
		if (typeof x === "object" && x !== null) {
			this.x = Number(x.x ?? 0)
			this.y = Number(x.y ?? 0)
		} else {
			this.x = Number(x)
			this.y = Number(y ?? 0)
		}
	}

	clone(): FakePoint {
		return new FakePoint(this.x, this.y)
	}

	sub(other: FakePoint | number): FakePoint {
		if (typeof other === "number") return new FakePoint(this.x - other, this.y - other)
		return new FakePoint(this.x - other.x, this.y - other.y)
	}

	add(other: FakePoint | number): FakePoint {
		if (typeof other === "number") return new FakePoint(this.x + other, this.y + other)
		return new FakePoint(this.x + other.x, this.y + other.y)
	}

	mul(other: FakePoint | number): FakePoint {
		if (typeof other === "number") return new FakePoint(this.x * other, this.y * other)
		return new FakePoint(this.x * other.x, this.y * other.y)
	}

	div(other: FakePoint | number): FakePoint {
		if (typeof other === "number") return new FakePoint(this.x / other, this.y / other)
		return new FakePoint(this.x / other.x, this.y / other.y)
	}

	dot(other: FakePoint): number {
		return this.x * other.x + this.y * other.y
	}

	absSquared(): number {
		return this.x * this.x + this.y * this.y
	}

	abs(): number {
		return Math.sqrt(this.absSquared())
	}

	distanceSquared(other: FakePoint): number {
		return this.sub(other).absSquared()
	}

	distance(other: FakePoint): number {
		return Math.sqrt(this.distanceSquared(other))
	}

	rotate(angleDeg: number, center: FakePoint = new FakePoint(), inRad = false): FakePoint {
		const angle = inRad ? angleDeg : (angleDeg * Math.PI) / 180
		const cos = Math.cos(angle)
		const sin = Math.sin(angle)
		const x = this.x - center.x
		const y = this.y - center.y
		return new FakePoint(x * cos - y * sin + center.x, x * sin + y * cos + center.y)
	}

	transform(_matrix: unknown): FakePoint {
		return new FakePoint(this.x, this.y)
	}

	eq(other: FakePoint, eps = 1e-7): boolean {
		return Math.abs(this.x - other.x) <= eps && Math.abs(this.y - other.y) <= eps
	}

	toArray(): [number, number] {
		return [this.x, this.y]
	}

	toTikzString(noParantheses = false): string {
		const scale = 127 / 4800
		const x = Number((this.x * scale).toFixed(3))
		const y = Number((-this.y * scale).toFixed(3))
		return noParantheses ? `${x}, ${y}` : `(${x}, ${y})`
	}

	toSVGPathString(): string {
		return `${this.x},${this.y}`
	}

	simplifyForJson() {
		return { x: this.x, y: this.y }
	}
}

export class FakeBox {
	x: number
	y: number
	x2: number
	y2: number

	constructor(x: any = 0, y = 0, w = 0, h = 0) {
		if (typeof x === "string") {
			const parts = x.trim().split(/\s+/).map(Number)
			;[x, y, w, h] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0, parts[3] ?? 0]
		}
		this.x = Number(x)
		this.y = Number(y)
		this.x2 = this.x + Number(w)
		this.y2 = this.y + Number(h)
	}

	get w() { return this.x2 - this.x }
	get width() { return this.w }
	get h() { return this.y2 - this.y }
	get height() { return this.h }
	get cx() { return (this.x + this.x2) / 2 }
	get cy() { return (this.y + this.y2) / 2 }

	merge(other: FakeBox): FakeBox {
		const x = Math.min(this.x, other.x)
		const y = Math.min(this.y, other.y)
		const x2 = Math.max(this.x2, other.x2)
		const y2 = Math.max(this.y2, other.y2)
		return new FakeBox(x, y, x2 - x, y2 - y)
	}

	transform(_matrix: unknown): FakeBox {
		return new FakeBox(this.x, this.y, this.w, this.h)
	}

	toString(): string {
		return `${this.x} ${this.y} ${this.w} ${this.h}`
	}
}

export class FakeMatrix {
	constructor(_args?: unknown) {}
	lmultiply() { return this }
	multiply() { return this }
	inverse() { return this }
}

export const fakeElement = () => {
	const element: any = {
		node: {
			classList: { add: vi.fn(), remove: vi.fn() },
			style: {},
			setAttribute: vi.fn(),
			getAttribute: vi.fn().mockReturnValue(null),
			append: vi.fn(),
			children: [],
		},
		hide: vi.fn(() => element),
		show: vi.fn(() => element),
		stroke: vi.fn(() => element),
		fill: vi.fn(() => element),
		attr: vi.fn(() => element),
		transform: vi.fn(() => element),
		plot: vi.fn(() => element),
		clear: vi.fn(() => element),
		size: vi.fn(() => element),
		center: vi.fn(() => element),
		move: vi.fn(() => element),
		use: vi.fn(() => element),
		add: vi.fn(() => element),
		addTo: vi.fn(() => element),
		remove: vi.fn(),
		put: vi.fn(() => element),
		insertAfter: vi.fn(() => element),
		insertBefore: vi.fn(() => element),
		parent: vi.fn().mockReturnValue({ index: vi.fn().mockReturnValue(0), add: vi.fn() }),
		index: vi.fn().mockReturnValue(0),
		find: vi.fn().mockReturnValue([]),
		findOne: vi.fn().mockReturnValue(null),
		children: vi.fn().mockReturnValue([]),
		clone: vi.fn(() => element),
		bbox: vi.fn().mockReturnValue(new FakeBox(0, 0, 10, 10)),
		array: vi.fn().mockReturnValue([[0, 0], [10, 10]]),
		addClass: vi.fn(() => element),
		removeClass: vi.fn(() => element),
	}
	return element
}

export const fakeCanvas = {
	rect: vi.fn().mockImplementation(() => fakeElement()),
	add: vi.fn().mockReturnThis(),
	line: vi.fn().mockImplementation(() => fakeElement()),
	text: vi.fn().mockImplementation(() => fakeElement()),
	polyline: vi.fn().mockImplementation(() => fakeElement()),
	group: vi.fn().mockImplementation(() => fakeElement()),
	circle: vi.fn().mockImplementation(() => fakeElement()),
	ellipse: vi.fn().mockImplementation(() => fakeElement()),
	polygon: vi.fn().mockImplementation(() => fakeElement()),
	path: vi.fn().mockImplementation(() => fakeElement()),
	use: vi.fn().mockImplementation(() => fakeElement()),
	symbol: vi.fn().mockImplementation(() => fakeElement()),
	find: vi.fn().mockReturnValue([]),
	findOne: vi.fn().mockImplementation(() => ({ ...fakeElement(), put: vi.fn().mockReturnThis() })),
	put: vi.fn().mockReturnThis(),
}

export const circuitComponents: any[] = []

export const fakeMainController = {
	instance: {
		addComponent: vi.fn((c: any) => circuitComponents.push(c)),
		circuitComponents,
		customSymbols: [],
	},
}

export const fakeCanvasController = {
	instance: { canvas: fakeCanvas },
}

export const fakeSelectionController = {
	instance: {
		selectComponents: vi.fn(),
		referenceComponent: null,
		viewSelection: vi.fn(),
	},
}

export const fakeUndo = { addState: vi.fn() }
export const fakeSnapDragHandler = { snapDrag: vi.fn() }
export const fakeSnapCursorController = { instance: { visible: false } }

vi.mock("@svgdotjs/svg.js", () => ({
	Point: FakePoint,
	Number: FakeNumber,
	Box: FakeBox,
	Color: class FakeColor {
		value: string
		r = 0
		g = 0
		b = 0
		constructor(value = "#000000") { this.value = String(value) }
		rgb() {
			const match = this.value.match(/^#?([0-9a-f]{6})$/i)
			const hex = match?.[1] ?? "000000"
			this.r = Number.parseInt(hex.slice(0, 2), 16)
			this.g = Number.parseInt(hex.slice(2, 4), 16)
			this.b = Number.parseInt(hex.slice(4, 6), 16)
			return this
		}
		toString() { return this.value }
		toTikzString() { return "{" + this.value + "}" }
	},
	G: class FakeG {
		node = { classList: { add: vi.fn(), remove: vi.fn() }, style: {} }
		add = vi.fn().mockReturnThis()
		addClass = vi.fn().mockReturnThis()
		find = vi.fn().mockReturnValue([])
		fill = vi.fn().mockReturnThis()
		bbox = vi.fn().mockReturnValue(new FakeBox(0, 0, 10, 10))
		transform = vi.fn().mockReturnThis()
		remove = vi.fn()
	},
	Text: class FakeText {
		node = { innerHTML: "", classList: { add: vi.fn(), remove: vi.fn() }, style: {} }
		transform = vi.fn().mockReturnThis()
		fill = vi.fn().mockReturnThis()
		attr = vi.fn().mockReturnThis()
		stroke = vi.fn().mockReturnThis()
		find = vi.fn().mockReturnValue([])
		bbox = vi.fn().mockReturnValue(new FakeBox(0, 0, 10, 10))
		remove = vi.fn()
	},
	Tspan: class FakeTspan {},
	Line: class {},
	Symbol: class FakeSymbol {
		node: any
		constructor(node: any = { id: "symbol" }) { this.node = node }
		id() { return this.node?.id ?? "symbol" }
		rect() { return fakeElement() }
		add() { return this }
	},
	Svg: class FakeSvg {
		node: any
		constructor(node: any = { style: {}, getAttribute: () => "1", height: { baseVal: { valueInSpecifiedUnits: 1 } } }) { this.node = node }
		findOne(selector: string) {
			if (selector === "defs") {
				return { children: () => [], remove: vi.fn(), put: vi.fn().mockReturnThis() }
			}
			return fakeElement()
		}
		find() { return [] }
		children() { return [] }
		viewbox() { return new FakeBox(0, 0, 1, 1) }
	},
	PointArray: class FakePointArray {
		points: unknown[]
		constructor(points: unknown[]) { this.points = points }
	},
	Element: class {},
	Matrix: FakeMatrix,
	extend: (klass: any, methods: Record<string, unknown>) => Object.assign(klass.prototype, methods),
	SVG: vi.fn().mockImplementation(() => fakeElement()),
}))

vi.mock("../src/scripts/controllers/canvasController", () => ({
	CanvasController: class FakeCanvasController {
		static instance = { canvas: fakeCanvas, lastCanvasPoint: new FakePoint() }
		static eventToPoint() { return new FakePoint() }
	},
}))

vi.mock("@svgdotjs/svg.draggable.js", () => ({}))
vi.mock("@svgdotjs/svg.panzoom.js", () => ({}))

Object.defineProperty(window, "MathJax", {
	value: {
		texReset: vi.fn(),
		tex2svg: vi.fn(() => ({
			querySelector: () => ({
				style: { verticalAlign: "0" },
				getAttribute: () => "1",
				height: { baseVal: { valueInSpecifiedUnits: 1 } },
			}),
		})),
	},
	writable: true,
})

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
	font: "",
	measureText: (text: string) => ({
		width: String(text).length * 8,
		actualBoundingBoxAscent: 8,
		actualBoundingBoxDescent: 2,
	}),
})) as any
