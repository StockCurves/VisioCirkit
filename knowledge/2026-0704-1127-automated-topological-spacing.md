# 自動化拓撲拉伸與排版最佳實踐 (Automated Topological Spacing)

## 遇到的挑戰 (Problem)
在將手繪電路圖或視覺辨識結果 (CV bounding boxes) 轉換為 `CircuiTikZ` 程式碼時，大型語言模型 (LLM) 往往能抓對「拓撲相對位置」（例如 A 在 B 上面，C 在 D 右邊），但無法精準拿捏「絕對實體距離」。

這會導致嚴重錯誤，例如：
*   兩個元件靠得太近，導致元件符號（如 Capacitor 的兩片平行板）直接超出版面。
*   一條長度只有 `0.32cm` 的線段上被塞入了一個長達 `0.8cm` 的元件，結果元件實體與相鄰的電晶體重疊、交錯，甚至穿透（如 R17 的垂直線穿越 C11）。
*   若單純在 TikZ 中使用全局的 `[scale=1.5]` 或 `[xscale=1.5]` 參數，雖然圖片變大，但元件本身的比例與距離問題並未解決（仍可能發生重疊），且在預覽器中通常會被自動縮放回視窗大小而看不出差異。

## 終極解決方案：正交拓撲網格拉伸 (Orthogonal Grid Relaxation)
電路圖在本質上是一個「正交圖 (Orthogonal Graph)」。元件與連線只能是水平或垂直。
為了解決這個問題，我們不應該讓 LLM 去瞎猜絕對座標，而是引導它排出正確的「相對網格 (Relative Grid)」，最後再由腳本來數學性地拉伸這些網格線。

### 核心演算法 (align_topology.py)
我們實作了 `align_topology.py` 腳本，其演算法邏輯如下：
1. **座標離散化與群集 (Coordinate Clustering)**：讀取 `.tikz` 檔案，找出所有 `(X, Y)` 座標點。
2. **提取網格基準與偏移 (Base & Offset Extraction)**：因為 `CircuiTikZ` 的電晶體有很多內部偏移量（如閘極預設 `dx = -0.98`，漏極 `dy = +0.77`），我們不能暴力拉伸所有節點間距。腳本會比對內建的偏移量列表 (Known Offsets)，將座標還原為 `(Base Grid + Offset)`。
3. **網格拉伸 (Grid Stretching)**：針對基礎網格 (Base Grid) 乘上指定的安全拉伸倍率（例如 `x_stretch=1.5`, `y_stretch=1.4`），但**絕對保留偏移量**不放大。
   *公式：* `New_X = (Base_X * Stretch) + Offset`
4. **重寫 TikZ 原始碼**：將重新計算後寬敞的絕對座標替換回原始檔中。

## 開發流程指南 (Workflow Integration)
此方法已標準化並寫入 `sch2tikz` 技能中：
1. LLM 根據 CV 提供之資訊，撰寫相對順序正確的 `.tikz`（無需費心計算小數點後的 Bounding Box 距離）。
2. 在自動化流程中，直接執行拓撲對齊指令：
   ```bash
   python .agents/skills/sch2tikz/scripts/align_topology.py input.tikz --output output_aligned.tikz --x_stretch 1.5 --y_stretch 1.4
   ```
3. 對 `output_aligned.tikz` 進行編譯與後續的幾何 Lint 檢查。
4. 最終輸出的 SVG 不僅拓撲精準，其排版間距（包含標籤與相鄰元件）皆能達到專業 EDA 軟體的佈局水準。

## 結論
**「相對位置交給 LLM，絕對防撞間距交給數學腳本」**是電路圖渲染目前最穩定且高品質的架構分工。
