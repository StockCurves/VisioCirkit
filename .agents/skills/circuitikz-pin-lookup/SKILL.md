---
name: circuitikz-pin-lookup
description: Use when generating TikZ code for CircuiTikZ-Designer and needing pin coordinate offsets for multi-pin components (op amp, logic gates, transistors, transformers). Use when wire alignment to component pins is required. Also use before writing the AI prompt section of a TikZ generation workflow.
---

# CircuiTikZ Pin Offset Lookup

## Overview

CircuiTikZ node-style components (op amp, logic gates, transistors) have named pins with fixed offsets from the component center. Use this skill to get exact offsets in cm so that wires align horizontally/vertically.

**Coordinate convention:**
- `dx > 0` = right of center, `dy > 0` = above center (circuit Y-up convention)
- Units: cm

## Quick Reference — Common Pin Offsets

| Component | Pin | dx (cm) | dy (cm) |
|-----------|-----|---------|---------|
| `op amp` | `-` (inverting) | -1.19 | +0.49 |
| `op amp` | `+` (non-inv.) | -1.19 | -0.49 |
| `op amp` | `out` | +1.19 | 0 |
| `american and port` | `in 1` | -1.386 | +0.28 |
| `american and port` | `in 2` | -1.386 | -0.28 |
| `american and port` | `out` | +0.154 | 0 |
| `npn` | `B` (base) | -0.84 | 0 |
| `npn` | `C` (collector) | 0 | +0.77 |
| `npn` | `E` (emitter) | 0 | -0.77 |
| `nmos` | `G` (gate) | -0.69 | 0 |
| `nmos` | `D` (drain) | 0 | +0.69 |
| `nmos` | `S` (source) | 0 | -0.69 |
| `transformer` | `A1` | -1.05 | +1.05 |
| `transformer` | `A2` | -1.05 | -1.05 |
| `transformer` | `B1` | +1.05 | +1.05 |
| `transformer` | `B2` | +1.05 | -1.05 |

## Wire Direction Guide

Use the pin's dx/dy to determine the correct wire direction:

| If pin has... | Wire direction | Example pins |
|---------------|----------------|--------------|
| `dy = 0`, `dx ≠ 0` | **Horizontal** — wire enters from left/right | MOSFET G, BJT B, logic `in`/`out`, op amp `+`/`-` |
| `dx = 0`, `dy ≠ 0` | **Vertical** — wire enters from top/bottom | MOSFET D/S, BJT C/E |
| both ≠ 0 (small dy) | **Horizontal** via pin ref — let parser align | op amp `+`/`-`, logic `in 1`/`in 2` |

### Node-style component wiring conventions

```
MOSFET / BJT                Logic gate             Op amp
──────────────              ──────────────         ──────────────
     D(C)                                              ─── (U1.-)
      │  ← vertical        ─── in 1 ─┐               ─── (U1.+)
── G ─┤  ← horizontal      ─── in 2 ─┤─ out ───       U1.out ───
      │  ← vertical                   ┘
     S(E)
```

### Path-style component direction (voltage/current sources, resistors…)

Path-style components (`to[...]`) have no fixed orientation — direction is set by start/end points:

```tikz
% Vertical voltage source (common — supply rail to ground)
\draw (2, 2) to[dcvsource, l=$V_s$] (2, 0) ;

% Horizontal resistor
\draw (0, 0.49) to[american-resistor] (U1.-) ;

% Vertical inductor
\draw (2, 3) to[american-inductor] (2, 1) ;
```

**Rule of thumb:** put voltage/current sources and inductors vertically; put resistors/capacitors in the direction of signal flow (often horizontal).

## Lookup Tool

For components not in the quick reference, use the CLI:

```bash
# From project root:
python scripts/lookup_pin_offset.py "op amp" "-"
python scripts/lookup_pin_offset.py "american-and-port" "in 1"
python scripts/lookup_pin_offset.py "npn"         # list all pins
python scripts/lookup_pin_offset.py --list         # list all known components
```

**Lookup chain:** `pin_offsets_compact.json` → `pin_offsets_full.json` → `symbols.svg` (direct parse)

If JSON files are stale, regenerate:
```bash
python scripts/extract_pin_offsets.py
```

## Usage Pattern

To draw a horizontal resistor into op amp inverting input:

```tikz
% 1. Place op amp at (cx, cy)
\node[op amp] (U1) at (3, 0) {} ;

% 2. Inverting input pin "-" is at: center + (dx=-1.19, dy=+0.49)
%    → world pos = (3 + (-1.19), 0 + 0.49) = (1.81, 0.49)
%    → For horizontal resistor, start point must have same Y = 0.49

\draw (0, 0.49) to[american-resistor, l=$R_1$] (U1.-) ;
```

**Rule:** start-point Y = `cy + dy_of_target_pin`

## Regenerating Data

Run after modifying `symbols.svg`:

```bash
python scripts/extract_pin_offsets.py
```

Outputs:
- `src/data/pin_offsets_compact.json` — 21 common multi-pin components
- `src/data/pin_offsets_full.json`    — 392 all components with pins

## Files

| File | Purpose |
|------|---------|
| `scripts/extract_pin_offsets.py` | Parse SVG → generate JSON files |
| `scripts/lookup_pin_offset.py` | CLI lookup tool for agents |
| `src/data/pin_offsets_compact.json` | Compact pin data (for prompt embedding) |
| `src/data/pin_offsets_full.json` | Full pin data (fallback) |

## Advanced Routing & Layout Strategy

When generating complex or fully differential circuits (e.g., integrators, nested feedback loops), agents MUST follow these precise routing rules to avoid visual clutter and logical errors:

### 1. Y-Axis Parallel Spacing & Label Clearance
- **NEVER** guess Y-coordinates for parallel horizontal paths.
- Establish a strict Y-axis grid. Parallel feedforward or feedback paths MUST be separated by **at least 1.2 cm to 1.5 cm** vertically.
- This ensures components (like capacitors/resistors) and their labels (which take up ~0.5 cm) do not overlap with adjacent horizontal wires.
- **Nesting Rule**: Inner loops must be routed closer to the main horizontal axis. Outer loops must be routed further away.

### 2. X-Axis Vertical Drop Spacing
- When multiple vertical wires descend or ascend to connect to a single horizontal output/input line, **DO NOT** bundle them at the same X-coordinate.
- Spread vertical connection points evenly along the X-axis with **at least 0.6 cm to 0.8 cm** spacing between each drop (e.g., $x=12.4, 13.2, 14.0$).
- **Routing Order**: Inner loops must descend/ascend first (closer to the component), and outer loops must descend/ascend later, avoiding self-intersections.

### 3. Fully Differential Crossover Awareness
- In fully differential circuits (`fd op amp`), feedback and feedforward paths often **cross over** to the opposite polarity (e.g., from the `+` input side to the `-` output side).
- **CRITICAL**: Do not assume lines route straight back to their own side. Analyze the source schematic carefully for crossed lines.
- When lines cross the main signal path or each other, draw a neat jump/bridge using an arc (e.g., `\draw (x, y_start) -- (x, y_mid + 0.1) arc(90:270:0.1) -- (x, y_end);`) to clearly indicate no connection.

### 4. Background Boxes & Layering
- When a circuit block is enclosed in a shaded/dashed box, draw the box **FIRST** (`\draw[dashed, fill=gray!8]...`) so it sits behind the components.
- The box dimensions must dynamically expand to fully encompass the widened X and Y routing grids established in rules 1 and 2.

### 5. TikZ Code Comments Language
- **ALWAYS** write comments inside the generated TikZ code using the exact same language as the user's prompt (e.g., if the user asks in Traditional Chinese, write `% 這裡放置 OP 放大器`; if English, write `% Place OP amp here`).
