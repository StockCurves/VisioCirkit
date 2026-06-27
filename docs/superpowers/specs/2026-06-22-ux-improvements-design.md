# Design Specification: UX Layout and Workspace Improvements

This specification details improvements to the layout behavior of the properties sidebar, component drawer, and the addition of quick access buttons in the navigation bar.

## 1. Objectives & Scope
The goal of this design is to optimize the screen space utilization of the right properties panel, make the "Save to Work" action more visible, and prevent layout conflicts when the component drawer is open.

Specifically:
- **Right Panel (Properties Panel)**: Should only be visible when exactly one component is selected.
- **Component Drawer**: Moves to the right side (`offcanvas-end`), avoiding overlap with the left-hand TikZ Editor.
- **Save to Work Action**: Moved to the top navigation bar (next to the template dropdown) for easy discovery.
- **Canvas Grid Settings**: Controlled via a ⚙️ toggle button in the top navigation bar, displaying/hiding the General Settings in the right sidebar.

---

## 2. Interface Changes

### 2.1 Navigation Bar (Navbar) Updates
- Add `Save to Work` button to the right of the `Template` dropdown.
- Add `Canvas Grid Settings` (⚙️) button to the right of the `Save to Work` button.

```html
<!-- Proposed addition to Navbar inside index.html -->
<li class="nav-item col-12 col-md-auto d-flex align-items-center gap-2 px-2">
    <button
        type="button"
        class="btn btn-outline-primary btn-sm fw-semibold d-flex align-items-center gap-1"
        id="navbarSaveWorkButton"
        data-bs-toggle="tooltip"
        data-bs-placement="bottom"
        data-bs-title="Save to Work">
        <span style="font-size: 1.05rem; line-height: 1;">📤</span>
        <span>Save to Work</span>
    </button>
</li>
<li class="nav-item col-12 col-md-auto d-flex align-items-center gap-2 px-2">
    <button
        type="button"
        class="btn btn-outline btn-sm fw-semibold d-flex align-items-center justify-content-center"
        id="navbarSettingsButton"
        data-bs-toggle="tooltip"
        data-bs-placement="bottom"
        data-bs-title="Canvas Grid Settings">
        <span style="font-size: 1.15rem; line-height: 1;">⚙️</span>
    </button>
</li>
```

### 2.2 Component Drawer Direction Change
- Change `leftOffcanvas` class from `offcanvas-start` to `offcanvas-end` in `index.html`.
- This ensures it slides in from the right and overlays the right sidebar area, keeping the left-hand TikZ editor fully visible.

### 2.3 Conditional Sidebar Visibility
- Hide `#propertiesContainer` by default (add `d-none` on load).
- Only show `#propertiesContainer` when:
  1. Exactly 1 component is selected (`panelState.mode === "single"`).
  2. Or, the user explicitly toggles the ⚙️ Settings button to view the general settings (`panelState.mode === "empty"` triggered via toggle).

---

## 3. Behavior & Controller Logic

### 3.1 Properties Visibility State
Introduce an internal state in `PropertyController.ts` to track whether general settings are currently toggled visible:
```typescript
private showGeneralSettings = false;
```
- In `update()`, check the selection. If `selection.length === 1`, we show properties. If `selection.length !== 1` (i.e. `0` or `> 1` elements selected), we hide the sidebar unless `showGeneralSettings` is true.
- When the ⚙️ Settings button is clicked:
  - Toggle `showGeneralSettings = !showGeneralSettings`.
  - If `showGeneralSettings` is true, clear selection (to avoid showing component properties) and show the sidebar in general settings mode.
  - Trigger `update()`.

### 3.2 View Synchronization & Resizing
- When the sidebar visibility toggles (hidden vs. shown), the width of the canvas viewport changes.
- We must call `CanvasController.instance.onResizeCanvas()` or trigger a resize/fit-view event to ensure that the canvas dimensions align properly and the viewport fits.

### 3.3 Save to Work Action Mapping
- Bind the click event of the new `#navbarSaveWorkButton` to trigger the click of the existing `#saveServerCodeButton` or call `TemplateController.instance.openSaveModal()`.

---

## 4. Verification Plan
- **Verification of Right Panel Auto-Hide**:
  - Load the application; the right sidebar must be hidden (`d-none`).
  - Select one component; the sidebar must slide/appear showing properties.
  - Select multiple components or deselect; the sidebar must disappear.
- **Verification of ⚙️ General Settings Button**:
  - Click the ⚙️ button in the navbar when nothing is selected; the sidebar must appear showing General Settings.
  - Click the ⚙️ button again; the sidebar must disappear.
- **Verification of Component Drawer Position**:
  - Open the component drawer; verify that it slides in from the right.
- **Verification of Save to Work Action**:
  - Click "Save to Work" in the navbar; check if the Save to Server dialog modal pops up properly.
