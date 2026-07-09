# 美觀調整策略對比 (A, B, C)

針對 `2026-0703-0830.tikz` 實作了三種策略的排列組合，比較視覺渲染效果：

*   **A (網格化/對齊整數)：** 強制將 M16 的中心點 (X=16.0) 對齊在 M1 (X=14.5) 與 M2 (X=17.5) 的正中央。
*   **B (獨立 X 軸縮放)：** 將整體排版的 X 軸設定 `xscale=1.3`，拉開左右間距。
*   **C (標籤位置最佳化)：** 調整了 R17、C11 等標籤的上下左右位置。

---

## 策略單獨比較

### 1. 僅使用 A (對齊 M16)
![Comb A](./comb_A_rendered.svg)

### 2. 僅使用 B (左右拉開)
![Comb B](./comb_B_rendered.svg)

### 3. 僅使用 C (標籤調整)
![Comb C](./comb_C_rendered.svg)

---

## 策略兩兩組合

### 4. A + B (對齊 + 拉開)
![Comb AB](./comb_AB_rendered.svg)

### 5. A + C (對齊 + 標籤)
![Comb AC](./comb_AC_rendered.svg)

### 6. B + C (拉開 + 標籤)
![Comb BC](./comb_BC_rendered.svg)

---

## 終極組合

### 7. A + B + C (全套美化)
![Comb ABC](./comb_ABC_rendered.svg)
