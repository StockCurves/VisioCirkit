# sch2tikz 佈局與美感優化實作計劃 (sch2tikz Layout & Aesthetics Refinement Implementation Plan)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 更新 `sch2tikz` 的 Skill 規則，引導 AI 代理人遵循明確的 Bounding Box 尺寸與走線避讓 Clearance 規則，並忠實保留斜線設計。

**Architecture:** 修改 `.agents/skills/sch2tikz/SKILL.md` 規則文件，新增規範表與排版規則。藉由單元編譯測試驗證新規則的相容性。

**Tech Stack:** CircuiTikZ, LaTeX, Markdown

---

### Task 1: 更新 sch2tikz SKILL.md 規則說明

**Files:**
- Modify: `.agents/skills/sch2tikz/SKILL.md:86-121`

- [ ] **Step 1: 將 Bounding Box 元件尺寸與 Clearance 排版規則寫入 SKILL.md**

在 `.agents/skills/sch2tikz/SKILL.md` 的 `Editor Compatibility Rules` 章節結尾（約 121 行前）置入以下段落：

```markdown
### 8. Proportional Spacing and Bounding Box Budgets
To prevent overlaps, text truncation, and crowded components, you MUST calculate and allocate coordinates using the following virtual Bounding Box (including clearance envelop) budgets (in cm):
- `op amp` / `comparator`: Width 2.4cm, Height 1.2cm
- Multi-pin logic ports (`nand`, `and`, `or`): Width 1.6cm, Height 1.0cm
- Single-pin logic ports (`not`): Width 1.4cm, Height 0.6cm
- Passive component / switch (`R`, `C`, `L`, `opening switch`): Width 1.0cm, Height 0.6cm
- Text Label: Width 1.5cm, Height 0.5cm (with explicit anchors e.g., [anchor=east])
- Timing Waveform Sketch: Width 4.5cm, Height 2.5cm

### 9. Clearance and Routing Rules
1. **Orthogonal Routing**: Unless the source schematic explicitly contains diagonal connections (e.g. cross-coupled latch feedback paths, bridge rectifiers, wheatstone bridges), all wiring MUST be strictly orthogonal (horizontal or vertical only) and aligned precisely with component pins.
2. **Intentional Diagonals**: If the source diagram intentionally uses diagonal paths, render them faithfully as diagonal lines using absolute coordinates. Do not attempt to force them into straight orthogonal lines.
3. **Wire Clearance**: Maintain at least 0.6cm clearance between any wire and adjacent parallel component bounding box edges.
4. **Block Isolation**: Maintain a minimum clearance gap of 1.5cm between independent logical stages (e.g., buffer block to comparator block).
5. **Connection Dots**: Use `\node[circ] at (x, y) {};` for T-junctions or cross connections. Do not use filled circles `\fill`.
```

- [ ] **Step 2: 檢查 SKILL.md 語法並提交**

執行：`git diff .agents/skills/sch2tikz/SKILL.md`
執行：`git add .agents/skills/sch2tikz/SKILL.md ; git commit -m "feat(sch2tikz): add bounding box and layout clearance rules to skill guide"`

---

### Task 2: 執行驗證與編譯測試

**Files:**
- Test: `sch2tikz-out/2026-0629-2130.tikz`

- [ ] **Step 1: 執行 verify_tikz.py 驗證本地 LaTeX 編譯狀態**

執行：`python .agents/skills/sch2tikz/scripts/verify_tikz.py sch2tikz-out/2026-0629-2130.tikz`
Expected Output:
```
Attempting local LaTeX compilation...
Running local pdflatex on sch2tikz-out/2026-0629-2130.tikz...
Converting .../2026-0629-2130.pdf to SVG using dvisvgm...
Local compilation successful! SVG saved to sch2tikz-out/2026-0629-2130_rendered.svg
```

- [ ] **Step 2: 檢查最終 Git 狀態**

執行：`git status`
Expected: 工作目錄乾淨（除了 untracked 的 local-render 暫存檔外，其他剛才編輯的檔案皆已 commit）
