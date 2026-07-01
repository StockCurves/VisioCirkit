# VisioCirkit 流程圖元件規格與測試方法

日期：2026-06-30

## 1. 目標

新增一組可在 VisioCirkit 內直接繪製流程圖的元件，讓使用者不需要手動調整一般矩形、多邊形與箭頭，就能快速建立標準流程圖。

這個功能應該優先復用現有繪圖能力：

- `ShapeLibraryController`：左側 Shape Library 的工具入口。
- `RectangleComponent`：矩形、文字框、可放置文字的節點。
- `EllipseComponent`：圓形、橢圓形節點。
- `PolygonComponent`：菱形、平行四邊形、五邊形等多邊形節點。
- `WireComponent`：直線、折線、箭頭與流程連線。
- TikZ parser / serializer：維持 TikZ code 作為可回讀、可編輯的主要來源。

第一版不建議重做一套流程圖引擎。流程圖應先作為「語意化 shape presets」加入現有 Shape Library，再視 round-trip 與維護需求逐步升級成獨立 `FlowchartNodeComponent`。

## 2. 使用者需求

### 2.1 基本需求

使用者可以從左側元件面板選取流程圖元件，放到畫布後直接編輯文字、大小、位置、樣式與連線。

必要流程：

1. 開啟左側 Shape Library。
2. 看到新的 `Flowchart` 分類。
3. 點選 `Start / End`、`Process`、`Decision`、`Input / Output` 或 `Flow Arrow`。
4. 在畫布放置元件。
5. 編輯元件文字。
6. 用箭頭連接不同元件。
7. 匯出或套用 TikZ 後仍能保留主要結構。

### 2.2 非目標

第一版不處理以下功能：

- 自動流程圖排版。
- BPMN 完整標準。
- Swimlane / 泳道圖。
- 自動避障 routing。
- 箭頭自動吸附到最近流程圖節點。
- 從 Mermaid flowchart 直接匯入。
- 跨頁流程圖管理。

這些可以作為後續版本，但不應阻塞第一版標準流程圖元件。

## 3. 元件清單

### 3.1 MVP 必做元件

| 元件 | 顯示名稱 | 用途 | 建議底層實作 | TikZ 建議 |
| --- | --- | --- | --- | --- |
| Terminator | Start / End | 開始、結束 | `RectangleComponent` preset 或新 flowchart node | `shape=rounded rectangle` 或 rectangle + rounded corners |
| Process | Process | 一般處理步驟 | `RectangleComponent` preset | `shape=rectangle` |
| Decision | Decision | 條件判斷 | `PolygonComponent` preset 或新 flowchart node | `shape=diamond` |
| InputOutput | Input / Output | 輸入、輸出 | `PolygonComponent` preset | `shape=trapezium` 或 polygon path |
| FlowArrow | Flow Arrow | 流程連線 | `WireComponent(false, true)` | `\draw[-latex] ...` 或目前 wire arrow 格式 |

### 3.2 第二階段建議元件

| 元件 | 顯示名稱 | 用途 | 實作備註 |
| --- | --- | --- | --- |
| Document | Document | 文件輸出 | 可先用簡化 path，波浪底線第二階段再做 |
| Database | Database | 資料庫、儲存 | 可用 cylinder shape；需要確認 TikZ library 依賴 |
| Subprocess | Subprocess | 子流程 | 矩形加左右雙線或內框 |
| Connector | Connector | 頁內連接點 | 圓形文字節點，不應和電路 `circ` 混淆 |
| OffPageConnector | Off-page Connector | 跨頁連接 | 五邊形 polygon preset |
| ManualInput | Manual Input | 人工輸入 | 梯形或斜頂四邊形 |
| Preparation | Preparation | 準備步驟 | 六邊形 |

## 4. 產品行為規格

### 4.1 Shape Library

左側 Shape Library 應新增一個 `Flowchart` accordion group，與現有 `Basic` group 並列。

建議順序：

1. Start / End
2. Process
3. Decision
4. Input / Output
5. Flow Arrow
6. Document
7. Database
8. Subprocess
9. Connector
10. Off-page Connector

每個按鈕都需要：

- `title`：顯示工具名稱。
- `searchData`：包含英文名稱、常用別名與中文語意，例如 `flowchart process rectangle step 流程 處理 步驟`。
- icon：使用 SVG.js 繪製簡單圖示，和現有 Shape Library 風格一致。
- 點擊行為：呼叫 `placeComponent(component)` 後關閉 drawer。

### 4.2 放置模式

建議規則：

- 節點型元件使用與矩形相同的放置體驗：點選後進入放置，畫布上可定位、選取、縮放。
- `Flow Arrow` 使用 `WireComponent(false, true)`，預設有 end arrow，支援折線。
- `Straight Flow Arrow` 可選擇是否一起加入；若加入，使用 `WireComponent(true, true)`。

### 4.3 預設尺寸

建議使用一致的預設尺寸，降低使用者放置後的調整成本。

| 元件 | 預設寬度 | 預設高度 | 備註 |
| --- | --- | --- | --- |
| Start / End | 140px | 56px | 圓角矩形 |
| Process | 150px | 70px | 一般步驟 |
| Decision | 130px | 90px | 菱形需保留文字空間 |
| Input / Output | 160px | 70px | 左右斜邊 |
| Document | 150px | 80px | 底部波浪形可後補 |
| Database | 110px | 90px | 圓柱 |
| Connector | 48px | 48px | 可放短文字 |
| Off-page Connector | 80px | 80px | 五邊形 |

### 4.4 預設樣式

第一版樣式應保持中性，避免流程圖和電路元件視覺衝突。

建議預設：

- stroke：使用 `defaultStroke`。
- stroke width：與現有 shape 預設一致。
- fill：白色或 transparent；若現有 theme 對白色不友善，使用 `default` fill 並讓 theme 處理。
- text：置中、垂直置中。
- font：沿用 `RectangleComponent` 現有文字系統。
- arrow：end arrow 預設 `latex`，線寬沿用 `WireComponent` 目前的 `0.4pt`，可考慮在流程圖 preset 調成 `0.6pt`。

### 4.5 可編輯 Properties

流程圖元件不應只是固定圖示。使用者放置後必須能像一般 shape 一樣調整外觀。

節點型元件必須支援：

- stroke color：線條顏色。
- stroke width：線條粗細。
- stroke style：實線、虛線等既有線型。
- stroke opacity：線條透明度。
- fill color：填滿顏色。
- fill opacity：填滿透明度。
- text：文字內容。
- text color：文字顏色。
- text font size：文字大小。
- text align / justify：水平與垂直對齊。

節點型元件包含：

- Start / End
- Process
- Decision
- Input / Output
- Document
- Database
- Subprocess
- Connector
- Off-page Connector

連線型元件必須支援：

- stroke color：線條顏色。
- stroke width：線條粗細。
- stroke style：實線、虛線等既有線型。
- stroke opacity：線條透明度。
- start arrow：起點箭頭樣式。
- end arrow：終點箭頭樣式。

連線型元件不支援 fill，因為線段本身沒有填滿區域。箭頭頭部的顏色應跟隨 stroke color。

若第一版使用現有 component presets：

- Process / Start-End 應沿用 `RectangleComponent` 的 stroke、fill、text properties。
- Decision / Input-Output 應沿用 `PolygonComponent` 的 `Strokable`、`Fillable` 與 label/text 能力。
- Flow Arrow 應沿用 `WireComponent` 的 stroke 與 arrow properties。
- Connector 若用 circle / ellipse，也必須保留 stroke、fill、text properties。

若第二階段新增 `FlowchartNodeComponent`，該 class 必須明確實作或 mix in 等價於 `Strokable`、`Fillable` 與文字編輯能力，不能讓自訂流程圖節點少掉既有 shape 的外觀調整能力。

Start / End 的圓角第一版可以固定；若後續要讓使用者調整圓角半徑，應新增獨立 property，例如 `corner radius`。

### 4.6 Snap points

流程圖節點必須有穩定的連接點。

最低要求：

- Process / Start / End：上、下、左、右四個 snap points。
- Decision：上、下、左、右四個主要 snap points；第二階段可加四個斜角點。
- Input / Output：上、下、左、右四個 snap points。
- Connector：上、下、左、右四個 snap points。
- Off-page Connector：上、下、左、右，必要時加底部尖點。

Decision 的四個方向非常重要，因為使用者會自然期待：

- 上方：進入條件。
- 左右：Yes / No 分支。
- 下方：預設通過或後續流程。

## 5. 技術規格

### 5.1 推薦第一版架構

第一版採用 `Flowchart preset factory`，新增一個小型 factory 模組，例如：

```ts
export type FlowchartShapeKind =
  | "terminator"
  | "process"
  | "decision"
  | "inputOutput"
  | "flowArrow"

export function createFlowchartComponent(kind: FlowchartShapeKind): CircuitComponent
```

factory 的責任：

- 建立現有 component instance。
- 套用預設尺寸。
- 套用預設文字 placeholder。
- 套用預設樣式。
- 若底層是 polygon，建立固定點位。
- 若底層是 wire，設定 end arrow。

`ShapeLibraryController` 只負責 render 按鈕與呼叫 factory，不應塞太多 shape 初始化細節。

### 5.2 可能需要新增的 helper

若現有 component 沒有公開 API 設定尺寸、文字或 polygon points，建議新增窄接口，而不是在 controller 內直接碰 private field。

候選 helper：

```ts
applyFlowchartDefaults(component, defaults)
createDiamondComponent()
createParallelogramComponent()
createTerminatorComponent()
```

若需要長期維護，第二階段再升級成：

```ts
class FlowchartNodeComponent extends ShapeComponent {
  kind: FlowchartShapeKind
}
```

### 5.3 TikZ 輸出策略

第一版有兩種可接受策略。

#### 策略 A：沿用現有 shape 輸出

優點：

- 實作最快。
- 不破壞現有 serializer。
- 不需要立即支援新 TikZ shape。

缺點：

- Decision / I/O 可能輸出成 polygon path，不是語意化 `shape=diamond`。
- 後續 parser round-trip 較難辨識語意。

適合 MVP。

#### 策略 B：輸出語意化 TikZ shape

建議輸出例：

```tikz
\node[shape=rectangle, minimum width=3cm, minimum height=1.4cm] at (0,0) {Process};
\node[shape=diamond, aspect=2, minimum width=3cm, minimum height=2cm] at (0,-2) {Decision};
\node[shape=trapezium, trapezium left angle=70, trapezium right angle=110] at (0,-4) {Input};
\draw[-latex] (0,-1) -- (0,-1.5);
```

優點：

- TikZ code 更乾淨。
- parser 可用 `shape` option 還原流程圖語意。
- 比較符合長期「TikZ code 是 source」的方向。

缺點：

- 需要確認 TikZ libraries，例如 `shapes.geometric`、`arrows.meta`。
- 需要 parser 支援更多 node shape。
- 視覺和編輯器內 SVG render 可能需要對齊。

建議：MVP 先採策略 A，但文件與資料模型預留 `flowchartKind`，讓第二階段能轉成策略 B。

### 5.4 JSON 儲存策略

若第一版只是 preset，JSON 可以沿用現有 component type，例如 rectangle / polygon / wire。

但建議在 metadata 預留：

```json
{
  "type": "rect",
  "flowchartKind": "process"
}
```

若現有 save object 不適合直接加欄位，則先不加，避免污染 parser。第二階段導入 `FlowchartNodeComponent` 時再新增：

```json
{
  "type": "flowchartNode",
  "kind": "decision",
  "position": { "x": 100, "y": 100 },
  "size": { "x": 130, "y": 90 },
  "text": { "text": "Approved?" }
}
```

### 5.5 Parser 回讀

第二階段應支援從 TikZ 回讀下列 patterns：

- `shape=rectangle` + rounded corners：Terminator。
- `shape=rectangle`：Process。
- `shape=diamond`：Decision。
- `shape=trapezium`：Input / Output。
- `shape=cylinder`：Database。
- `\draw[-latex] ...`：Flow Arrow。

回讀優先順序：

1. 若 TikZ option 明確包含 `flowchartKind` 或自訂 comment metadata，使用該語意。
2. 否則根據 `shape=` 推斷。
3. 若無法推斷，退回現有 rectangle / ellipse / polygon / wire。

### 5.6 Required TikZ libraries

若採用語意化 TikZ shape，可能需要：

```tikz
\usetikzlibrary{shapes.geometric, arrows.meta}
```

若只沿用 polygon path 與現有 wire，第一版可以不新增 library。

## 6. UI 細節

### 6.1 分類命名

左側分類名稱使用：

```text
Flowchart
```

按鈕標題使用英文，避免現有 UI 混雜：

- Start / End
- Process
- Decision
- Input / Output
- Flow Arrow

搜尋資料可包含中文關鍵字，方便未來若搜尋框支援中文：

```text
flowchart process rectangle step 流程 處理 步驟
```

### 6.2 Icon 規格

icon 使用 SVG.js 簡單繪製，不使用外部圖片。

尺寸應符合現有 `.libComponent` 的可用空間：

- 使用固定 `viewbox`。
- stroke 不超出圖示範圍。
- 不依賴文字作為主要圖示。
- Decision / InputOutput 等圖示需保持可辨識。

### 6.3 Properties

MVP 不新增 Properties panel。

流程圖節點應沿用現有屬性：

- Text
- Fill
- Stroke
- Position / size
- Rotation，如現有 shape 支援

第二階段若新增 `FlowchartNodeComponent`，可新增：

- Flowchart kind
- Branch labels for decision，暫不建議第一版做
- Connector mode，暫不建議第一版做

## 7. 實作計畫

### Phase 1：MVP

目標：新增 Flowchart group 與 5 個核心工具。

工作項目：

1. 新增 flowchart preset factory。
2. 在 `ShapeLibraryController.render()` 中渲染 `Flowchart` group。
3. 新增 Start / End、Process、Decision、Input / Output、Flow Arrow 按鈕。
4. 補 `shapeLibraryController.test.ts`，確認按鈕數量、標題與 click 行為。
5. 手動確認 UI 圖示、放置、選取、拖曳與 TikZ 輸出。

驗收條件：

- Shape Library 有 `Basic` 與 `Flowchart` 兩組。
- Flowchart 至少有 5 個工具。
- 點選每個工具都會呼叫 `placeComponent()`。
- Flow Arrow 預設有箭頭。
- 生成 TikZ 不報錯。

### Phase 2：語意化資料模型

目標：讓流程圖元件 round-trip 更穩定。

工作項目：

1. 評估新增 `FlowchartNodeComponent`。
2. 定義 `flowchartKind` save object。
3. 將 Decision / InputOutput / Database 等節點輸出為語意化 TikZ shape。
4. 補 parser 支援。
5. 補 round-trip tests。

驗收條件：

- TikZ 中的 `shape=diamond` 可回讀為 Decision。
- Decision 匯出再匯入後仍是 Decision，而不是普通 polygon。
- 文字、尺寸、位置保留。

### Phase 3：進階流程圖體驗

目標：提升可用性。

候選功能：

- Ctrl / Shift 放置時保持標準比例。
- Decision 快速新增 Yes / No label。
- 點選節點邊緣快速拉出 Flow Arrow。
- 自動對齊與等距分布。
- 從選取的多個節點建立簡單垂直流程。

## 8. 測試方法

### 8.1 單元測試：Shape Library render

檔案：

```text
tests/shapeLibraryController.test.ts
```

測試重點：

1. render 後應包含 `Basic` group。
2. render 後應包含 `Flowchart` group。
3. Flowchart button 數量符合 MVP。
4. 每個 button 有正確 `title`。
5. 每個 button 有可搜尋的 `searchData`。

範例 assertions：

```ts
expect(root.textContent).toContain("Flowchart")
expect([...root.querySelectorAll(".libComponent")].map((el) => (el as HTMLDivElement).title))
  .toContain("Decision")
```

### 8.2 單元測試：點擊放置

測試每個流程圖按鈕：

1. dispatch `mouseup`。
2. 確認 `placeComponent()` 被呼叫。
3. 確認 `hideDrawer()` 被呼叫。
4. 確認放置模式正確：
   - 節點型元件應呼叫合適的 mode switch。
   - Flow Arrow 應使用 pan mode 或與現有 arrow 一致的模式。

最低測試：

- Start / End creates rectangle-like component。
- Decision creates polygon-like 或 flowchart node component。
- Flow Arrow creates wire-like component。

### 8.3 單元測試：factory

若新增 `flowchartComponentFactory.ts`，應直接測 factory。

測試案例：

| kind | 預期 |
| --- | --- |
| `terminator` | 回傳可放文字的節點，預設尺寸存在 |
| `process` | 回傳矩形節點 |
| `decision` | 回傳菱形 polygon 或 flowchart node |
| `inputOutput` | 回傳平行四邊形 polygon 或 flowchart node |
| `flowArrow` | 回傳 wire component，end arrow enabled |

若 component class 很難在 jsdom 中完整初始化，可以 mock internal classes，只測 factory 是否以正確參數建構。

### 8.4 TikZ serializer 測試

如果 MVP 沿用現有 shape serializer：

- 測試新增元件不破壞既有 rectangle / polygon / wire TikZ 輸出。
- 測試 Flow Arrow 輸出包含 arrow option。

如果第二階段支援語意化 TikZ：

新增測試：

```ts
expect(tikz).toContain("shape=diamond")
expect(tikz).toContain("minimum width=")
expect(tikz).toContain("Approved?")
```

Decision 輸出範例：

```tikz
\node[shape=diamond, minimum width=3cm, minimum height=2cm] at (0,0) {Approved?};
```

### 8.5 Parser 測試

檔案候選：

```text
tests/tikzParser.test.ts
tests/tikzCorpusRoundTrip.test.ts
```

第二階段 parser 測試案例：

1. `shape=diamond` 解析為 Decision。
2. `shape=trapezium` 解析為 Input / Output。
3. `shape=cylinder` 解析為 Database。
4. `\draw[-latex] (0,0) -- (1,0);` 解析為 flow arrow / wire。
5. 未知 shape 不應 throw，應退回一般 node 或現有 fallback。

注意：當 canonicalization 重要時，測試應 assert 最終 serialized TikZ，而不只是 parser object。

### 8.6 JSON save/load 測試

MVP 若未新增 save type，只需確認現有 shape JSON 沒有被破壞。

第二階段若新增 `flowchartNode`：

測試：

1. `toJson()` 包含 `type: "flowchartNode"`。
2. `toJson()` 包含 `kind`。
3. `fromJson()` 後 `kind`、位置、尺寸、文字保留。
4. 舊檔案沒有 `flowchartKind` 時仍能正常讀取。

### 8.7 UI 手動測試

啟動本地 app 後執行：

```powershell
npm.cmd start
```

手動測試 checklist：

- 左側 Shape Library 顯示 `Flowchart` 分類。
- 每個流程圖 icon 沒有超出按鈕。
- 點選 Start / End 後可放置。
- 點選 Process 後可放置。
- 點選 Decision 後可放置且外觀像菱形。
- 點選 Input / Output 後可放置且外觀像平行四邊形。
- 點選 Flow Arrow 後可畫出帶箭頭的連線。
- 選取元件後 properties panel 可編輯文字。
- 縮放元件後文字仍在合理位置。
- 匯出 TikZ 後 code 沒有語法錯誤。
- Apply / round-trip 後元件沒有明顯錯位。

### 8.8 視覺回歸測試

若已有 Playwright 或瀏覽器自動化測試，可增加流程：

1. 開啟 app。
2. 展開 Flowchart group。
3. 截圖左側元件面板。
4. 放置 Process、Decision、Flow Arrow。
5. 截圖畫布。
6. 比對截圖是否非空、元件是否在預期位置。

最低人工視覺驗收：

- icon 清楚。
- 元件比例合理。
- arrow head 方向正確。
- 文字不超出節點太多。
- 深色/淺色主題下都看得到。

### 8.9 建議執行命令

針對第一版：

```powershell
npm.cmd test -- tests/shapeLibraryController.test.ts
```

若新增 factory 測試：

```powershell
npm.cmd test -- tests/shapeLibraryController.test.ts tests/flowchartComponentFactory.test.ts
```

若新增 parser / serializer：

```powershell
npm.cmd test -- tests/tikzParser.test.ts tests/tikzCorpusRoundTrip.test.ts
```

完整 build gate 視當前 repo 狀態執行：

```powershell
npm.cmd run build
```

如果 Windows PowerShell 阻擋 `npm.ps1`，使用 `npm.cmd`，不要直接用 `npm`。

## 9. 風險與決策

### 9.1 最大風險：MVP 太快導致 round-trip 語意流失

如果 Decision 只是 polygon，匯出再匯入後可能變成普通 polygon。這對 MVP 可接受，但文件與程式命名要保留升級空間。

建議：

- 第一版可以接受普通 polygon。
- 第二階段必須支援 `flowchartKind` 或語意化 TikZ shape。

### 9.2 最大風險：直接改太多 parser

Parser 是高風險區域。第一版若只是新增工具，不應同時大改 parser。

建議：

- MVP：只加 Shape Library 與 presets。
- Parser：獨立 PR / 獨立 commit。
- Round-trip：用 focused tests 驗證。

### 9.3 最大風險：UI icon 擠壓或 overflow

Shape Library 空間有限，新增 group 和 icon 時要避免文字或 SVG 超出。

建議：

- icon 使用固定 viewbox。
- button title 用 tooltip，不在 icon 內放長文字。
- render test 補 button count 和 title。
- 手動看一次桌面寬度與較窄側欄。

## 10. 建議驗收標準

第一版完成時，應符合：

- `Flowchart` group 出現在 Shape Library。
- 至少 5 個 MVP 元件可放置。
- 每個 MVP 元件有清楚 icon。
- Flow Arrow 預設帶箭頭。
- Process / Decision / Start-End 可輸入文字。
- Focused tests 通過。
- 手動匯出 TikZ 不報錯。
- 沒有改動 `sch2tikz-out` 既有 corpus 檔案。

第二階段完成時，應符合：

- Decision / InputOutput / Database 有穩定語意模型。
- TikZ round-trip 後語意不流失。
- Parser tests 覆蓋常見 TikZ shape。
- Serializer tests assert 最終 TikZ 字串。

## 11. 推薦下一步

建議先實作 Phase 1：

1. 新增 `src/scripts/components/flowchartComponentFactory.ts` 或相近位置。
2. 將 `ShapeLibraryController` 的 group 建立邏輯抽小一點，避免 Basic 與 Flowchart 重複大量 DOM code。
3. 新增 5 個 MVP tools。
4. 擴充 `tests/shapeLibraryController.test.ts`。
5. 跑 focused test。

這個切片足夠小，能快速交付使用價值，也不會過早把 parser、serializer、custom symbol 與 TikZ library 依賴一起拉進來。
