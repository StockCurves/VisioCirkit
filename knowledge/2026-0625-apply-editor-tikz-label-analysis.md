# Visual Editor Apply 與 TikZ / LaTeX Label 分析

日期：2026-06-25

## 問題摘要

這份筆記整理三件事：

1. Visual editor 按下 `Apply` 之後，程式怎麼處理 TikZ code。
2. 為什麼 LaTeX label 常常會出錯，或按完 `Apply` 之後樣子變掉。
3. 目前能不能支援這種全域設定：
   `\ctikzset{bipole label style={font=\LARGE\sffamily}}`

---

## 1. Apply 的流程原理

目前 `Apply` 不是「把你輸入的 TikZ 原文直接保留，再局部修改」。

它實際上走的是這條路：

`編輯器文字 -> parseTikz() 解析 -> 轉成內部元件/JSON-like save objects -> 清空畫布上的舊元件 -> 重新建立新元件 -> 再由元件重新輸出 TikZ`

所以本質上它是：

`parse-and-rebuild`

不是：

`raw-text-preserving edit`

### 具體流程

1. `TikzEditorController.applyEditorText()` 先取出 editor 內目前的全文字。
2. 呼叫 `parseTikz(codeText)`。
3. parser 先做前處理：
   - 去掉註解 `% ...`
   - 去掉/略過 preamble 類內容，例如 `\documentclass`、`\usepackage`、`\usetikzlibrary`
   - 也會把 `\ctikzset{...}` 直接視為 preamble 略過，不把它解析成元件
4. parser 把可辨識的 `\draw` / `\node` / path 元件轉成內部 save objects。
5. `applyEditorText()` 清空目前畫布上的元件。
6. 將 parse 出來的物件重新 `CircuitComponent.fromJson(...)` 建回畫布。
7. 成功後呼叫 `updateEditorText()`，由目前畫布上的元件重新序列化成新的 TikZ 字串。

### 這代表什麼

- 你的原始排版不會被保留。
- `%` 註解不會被保留。
- 某些 parser 不理解、但原本 LaTeX 可編譯的寫法，可能在 round-trip 後被改寫、簡化，甚至丟失。
- 只要某個資訊沒有被 parser 存進內部模型，它下一次輸出時就不會再出現。

這也和 UI 裡 help 文案一致：按 `Apply` 會重組 TikZ code，並丟掉 comments。

---

## 2. 為什麼 LaTeX label 常常會有錯誤

這個 repo 裡的 label 問題，不是單一 bug，比較像三層結構性落差疊在一起。

### A. label 不是完整 LaTeX round-trip，而是被「清洗」後再存回模型

parser 在吃 label 時，會先經過 `cleanTikzText()`。

這一步會主動做幾件事：

- 去掉外層 `{ ... }`
- 去掉外層 `$ ... $`
- 去掉常見字級命令：
  - `\tiny`
  - `\scriptsize`
  - `\footnotesize`
  - `\small`
  - `\normalsize`
  - `\large`
  - `\Large`
  - `\LARGE`
  - `\huge`
  - `\Huge`

所以如果你的 label 內容靠這些命令控制樣式，parser 讀進來時就可能被剝掉。

結果是：

- 原始 TikZ 能編譯
- 但進 editor 再 `Apply`
- label 文字被 normalize
- 再 export 時長得和原本不一樣

### B. 畫布預覽不是完整 LaTeX 編譯，而是 MathJax / SVG 近似渲染

畫布上的 label render 走的是 `renderMathJax(...)`，不是把整份電路真的丟進 LaTeX 編譯器。

這代表它比較像：

- 一套前端的數學/文字渲染近似
- 搭配 `Computer Modern Serif` 字型與自家 parser

不是：

- 完整 TeX engine
- 完整 circuitikz label style 繼承
- 完整 macro / package 行為

因此常見落差會是：

- editor 畫面顯示和最後 LaTeX 編譯結果不完全一樣
- 某些 LaTeX 指令前端 render 得出來，但 round-trip 後語意變了
- 某些 LaTeX 指令在前端就不穩

### C. node label 與 path label 的輸出規則不完全一致

目前程式對兩類 label 的處理不同：

- `node` 類 label：
  如果字串裡已經有 `$...$`，或偵測到字級命令，會盡量不要再自動包 `$...$`

- `path` 類 label：
  `buildTikzPathLabel()` 幾乎是直接把內容包成 `$...$`

所以如果你輸入的是比較偏文字模式、命令混合、或本來已經半包數學模式的內容，兩條路的行為可能不同。

這也是 label 常讓人感覺「有時正常、有時怪掉」的原因之一。

### D. 全域 `\ctikzset` 樣式和元件內部 label 模型是兩個世界

像 `bipole label style` 這種東西，本來應該是 circuitikz 的全域樣式層。

但 editor 內部 label 又另外存：

- 文字內容
- 顏色
- gap
- anchor / position
- side

也就是說，這個 app 不是單純把 label 原封不動當 TikZ source 管理，而是把它拆成自己的屬性模型。

一旦拆模，就容易出現：

- 原本依賴全域 style 的效果，在 visual model 裡沒有對應欄位
- export 時能不能回復，要看 serializer 有沒有支援
- preview 時能不能看到，要看前端 render 有沒有支援

---

## 3. `\ctikzset{bipole label style={font=\LARGE\sffamily}}` 目前能不能設定？

### 短答案

目前看起來：

- `\ctikzset{...}` 會在 parser 階段被略過，不會轉成可編輯的 visual 設定
- editor 內建的全域設定只有少數幾項，不是任意 `ctikzset`
- 所以這種設定目前**不能被穩定地當成 visual editor 的正式設定項管理**

### 更精確地說

目前 `EnvironmentVariableController` 支援的全域 TikZ 設定很有限，只看到這幾類：

- voltage style
- voltage convention
- label orientation

其中只有 `labelOrientation` 會輸出成 `ctikzset`，而且值也只有這三種：

- `label/align=smart`
- `label/align=rotate`
- `label/align=straight`

也就是說，現在的系統比較像：

- 有一小組「白名單式」全域設定
- 這些設定可轉成 `environment[]` 或 `ctikzset[]`

不是：

- 讓使用者自由輸入任何 `\ctikzset{...}`
- 再由 parser / preview / export 完整保留

### 對你給的例子代表什麼

這一行：

` \ctikzset{bipole label style={font=\LARGE\sffamily}}`

在目前系統裡有三個層面的限制：

1. **Import/Apply 層**
   parser 會把它當 preamble 跳過，不會把它變成 editor 的設定物件。

2. **Preview 層**
   label 顯示主要走 MathJax / SVG，不一定會忠實反映 `\sffamily` 或 circuitikz 的 `bipole label style`。

3. **Round-trip 層**
   即使原始碼裡手動寫了這行，按 `Apply` 之後重新輸出的 code 不一定能保留這個設定，因為它不在 visual model 的正式資料結構裡。

---

## 4. 實務上該怎麼理解這件事

如果把這個 visual editor 看成「TikZ-aware structured editor」，會比較準。

不要把它看成：

- 完整 LaTeX source editor
- 完整 circuitikz style-preserving round-trip editor

而比較像：

- 能吃一部分 TikZ
- 轉成自己的元件模型
- 再輸出成它能掌控的 TikZ 子集合

所以：

- 幾何、元件、wire、基本 label，通常比較適合 round-trip
- 進階 label 字體控制、複雜 macro、依賴全域 style 的寫法，最容易在 `Apply` 後失真

---

## 5. 結論

### Apply 之後 code 怎麼被調整

它會把原始 TikZ parse 成內部元件模型，再重新輸出新的 TikZ。
因此會重組排版、刪掉註解，也可能把 parser 沒有完整保存的 LaTeX 細節改寫掉。

### 為什麼 latex label 常常有錯

主因不是單一 compile error，而是：

- parser 會清洗 label 文字
- preview 用的是 MathJax / SVG 近似渲染，不是完整 LaTeX
- node/path label 的自動包裝規則不完全一致
- 全域 `ctikzset` 樣式與 app 內部 label 模型並沒有完全對齊

### 能不能設定 `bipole label style={font=\LARGE\sffamily}`

以目前架構來看，不算正式支援。

更準確地說：

- 你可以在原始 TikZ 裡手寫它
- 但 visual editor 不會把它當成可管理設定
- 按 `Apply` 後也不保證 preview、parser、round-trip export 都能忠實保留

---

## 6. 如果之後要做功能設計，建議方向

若未來要正式支援這類設定，至少要補齊三層中的其中兩層以上：

1. **資料模型層**
   有地方正式存 arbitrary global `ctikzset`

2. **parser / serializer 層**
   `Apply` 時保留並重新輸出這些設定

3. **preview 層**
   label 預覽能反映至少一部分字型 / style 設定

否則就會出現：

- source 有
- preview 沒反映
- Apply 後又丟掉

這種使用者最難理解的狀態。
