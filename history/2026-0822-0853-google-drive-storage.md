# Google Drive 雲端儲存與同步功能實作計畫 (Implementation Plan)

## 📌 Context & Requirements
根據 `/grill-me` 訪談結論，本計畫將為 VisioCirkit 建立前端雲端儲存機制，使使用者可透過 Google OAuth 登入，並將工作區電路圖檔 (`.tex`) 與自訂符號庫資料備份同步至個人的 Google Drive 中。

### 核心設計決定
1. **可擴充雲端儲存架構 (StorageAdapter Pattern)**：定義標準 `IStorageAdapter` 介面，優先實作 `GoogleDriveStorageAdapter`，未來可無縫擴充 `OneDriveStorageAdapter`。
2. **純前端 PKCE / Google Identity Services (GIS) 驗證**：利用 OAuth 2.0 Implicit / PKCE 流程於前端取得 Access Token 直接存取 Google Drive REST API，零後端負擔，100% 相容靜態託管（如 Vercel / GitHub Pages）。
3. **儲存範疇與目錄 (drive.file Scope)**：使用 `https://www.googleapis.com/auth/drive.file` 權限，於使用者 Google Drive 建立 `VisioCirkit/` 資料夾保存檔案。
4. **雙向同步與 UI 整合**：
   - 頂部導覽列增加雲端狀態控制區（包含 Google 登入/登出按鈕、使用者頭像/名稱、同步狀態標籤）。
   - 提供手動「立即同步 (Sync Now)」按鈕以及「自動同步 (Auto-Sync)」開關選項。

---

## 🏗️ Proposed Changes & Architecture

### 1. Services Layer (抽象層與 Google Drive 實作)

#### [NEW] [storageAdapter.ts](file:///Users/chienchungting/projects/VisioCirkit/src/scripts/services/storageAdapter.ts)
- 定義 `IStorageAdapter` 介面：
  - `login(): Promise<CloudUser>`
  - `logout(): Promise<void>`
  - `getUser(): CloudUser | null`
  - `listFiles(): Promise<CloudFile[]>`
  - `getFile(fileId: string): Promise<string>`
  - `saveFile(name: string, content: string, fileId?: string): Promise<CloudFile>`
  - `deleteFile(fileId: string): Promise<void>`

#### [NEW] [googleDriveStorageAdapter.ts](file:///Users/chienchungting/projects/VisioCirkit/src/scripts/services/googleDriveStorageAdapter.ts)
- 封裝 Google Identity Services (GIS) Client Token / Implicit OAuth 觸發邏輯。
- 封裝 Google Drive REST API `v3` 呼叫（搜尋 `VisioCirkit` 資料夾、建立資料夾、上傳/覆寫檔案、讀取檔案列表與內容）。

#### [NEW] [cloudSyncService.ts](file:///Users/chienchungting/projects/VisioCirkit/src/scripts/services/cloudSyncService.ts)
- 協調本地 IndexedDB (`WorkFileRepository`, `CustomSymbolRepository`) 與當前選用的 `StorageAdapter`。
- 負責雙向比對檔名與更新時間戳 (Timestamp)，執行衝突處理與同步備份。

---

### 2. UI Layer & Component Integration

#### [MODIFY] [index.html](file:///Users/chienchungting/projects/VisioCirkit/src/pages/index.html)
- 載入 Google Identity Services SDK 腳本 (`https://accounts.google.com/gsi/client`)。
- 在 Header / Toolbar 區域新增 Cloud Sync 控制項容器。

#### [NEW] [cloudSyncUiController.ts](file:///Users/chienchungting/projects/VisioCirkit/src/scripts/controllers/cloudSyncUiController.ts)
- 處理 Header 雲端 UI 控制元件的事件監聽與狀態渲染（登入狀態、頭像顯示、手動同步按鈕點擊、自動同步 Toggle 狀態切換）。

---

### 3. Automated Unit & Integration Tests

#### [NEW] [googleDriveStorageAdapter.test.ts](file:///Users/chienchungting/projects/VisioCirkit/tests/googleDriveStorageAdapter.test.ts)
- 單元測試：Mock HTTP REST API 請求，驗證搜尋資料夾、檔案建立與讀取邏輯。

#### [NEW] [cloudSyncService.test.ts](file:///Users/chienchungting/projects/VisioCirkit/tests/cloudSyncService.test.ts)
- 單元測試：測試本地 IndexedDB 儲存庫與 Mock StorageAdapter 之間的雙向同步比對邏輯。

---

## 🧪 Verification Plan

### Automated Tests
- 執行 `npm run test` (Vitest) 確保現有與新增的單元測試全數通過：
  `npx vitest run tests/googleDriveStorageAdapter.test.ts tests/cloudSyncService.test.ts`

### Manual Verification
1. 設定 `.env.local` 之 `VITE_GOOGLE_CLIENT_ID` 或以軟 Mock 模式驗證介面。
2. 啟動開發伺服器 `npm run start` 存取開發介面。
3. 測試點擊「登入 Google」按鈕跳出認證，成功登入後頭像與 Email 正確顯示於頂部。
4. 測試點擊「立即同步」，確認本地電路檔同步寫入雲端並更新同步狀態。
