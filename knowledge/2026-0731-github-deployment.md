# GitHub Login Deployment 評估備忘

日期：2026-07-31

## 目的

本文整理 VisioCirkit 若要部署 GitHub 登入與 GitHub-backed storage，需要做的產品、架構、資料儲存、安全與驗證考量。目標不是立即指定唯一實作，而是提供日後實作 `github-vc` production flow 時可回看的 decision record。

## 結論摘要

建議短期採用獨立的 `github-vc` deployment target，而不是把 GitHub login 混進目前 static demo。GitHub OAuth 需要 server-side callback 與 secret exchange，因此部署上至少需要 serverless API routes。

安全上，production 不應讓 browser JavaScript 直接持有 GitHub access token，也不應把 token 放進 URL 或 `localStorage`。建議使用：

- `/api/auth/github` 啟動 OAuth authorization code flow。
- `/api/auth/github/callback` 在 server 端驗證 `state`，交換 `code`，加密 GitHub token 後寫入 `HttpOnly; Secure; SameSite=Lax` session cookie。
- Browser 只呼叫 same-origin `/api/github/...` proxy，由 server 端附上 GitHub bearer token。
- 所有 GitHub write/delete/create repo 動作都走同源 server route，並加上 CSRF / Origin 防護。

長期若要降低權限風險，應評估改用 GitHub App。GitHub 官方也建議優先考慮 GitHub App，因為 GitHub App 可用 fine-grained permissions、讓使用者控制可存取 repository、並使用較短生命週期 token。OAuth App 的 `repo` scope 對 private repository 讀寫權限很廣，適合快速 prototype，不適合作為最終最小權限模型。

## 現有設計與缺口

現有設計文件已有方向：

- `docs/superpowers/specs/2026-07-07-github-version-control-design.md`
- `docs/deployment/github-vc-vercel.md`

現有方向包含：

- `github-vc` runtime preset。
- GitHub login UI 與 repo selector。
- `GitHubTemplateDataSource` 將 work 檔案映射到 GitHub repository contents API。
- `GitHubCustomSymbolSyncService` 將 custom symbols / categories 同步到 `visiocirkit-library`。

需要補強的缺口：

- 不要在 browser 直接呼叫 `api.github.com` 並把 token 放在 client-side 可讀位置。
- 未登入前不要啟動 GitHub sync 或 repo list，避免初始化時產生誤導性 `401`。
- Repo selection / creation / save / delete 要有明確 UX 狀態與錯誤處理。
- Storage schema 要固定，避免日後 migration 困難。
- GitHub write API 要處理 SHA conflict、rate limit、branch protection、409/422。
- Security headers、CSRF 防護、cookie 設定、env secret 管理需要列入 deployment gate。

## User Flow

登入流程：

1. 使用者在 navbar 點 GitHub icon。
2. App 導向 `/api/auth/github`。
3. Server 產生 random `state`，寫入 short-lived state cookie，redirect 到 GitHub OAuth authorize URL。
4. 使用者在 GitHub 授權。
5. GitHub redirect 回 `/api/auth/github/callback?code=...&state=...`。
6. Server 驗證 `state`，使用 `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` exchange access token。
7. Server 加密 token 放入 HttpOnly session cookie，redirect 回 app。
8. App 呼叫 `/api/auth/session` 取得 profile summary，顯示 avatar、repo selector、logout。

Repo flow：

1. 登入後列出使用者可存取 repo。
2. 使用者選擇既有 repo，或按 Create New Repo。
3. App 將 active repo 存成 local UI preference，例如 `github_active_repo = owner/repo`。這不是 credential，只是目前工作區選擇。
4. 未選 repo 時，Save / Load GitHub work 應 disabled 或顯示「先選 repo」。
5. 選 repo 後，work list 從 GitHub tree / contents API 取得 `.tex`。

Save/load flow：

1. `Load` 讀取 `work/*.tex` 或根目錄 `.tex`，依最終 schema 決定。
2. `Save` 先取得目前檔案 SHA，使用 create/update file contents API commit。
3. 若 GitHub 回 `409 Conflict`，顯示 remote changed prompt：Reload remote / overwrite with latest SHA / save as new file。
4. `Delete` 要 confirm，並附 commit message。

Custom symbol flow：

1. 登入成功後才啟動 background sync。
2. Local IndexedDB 仍是快速讀寫 cache。
3. Remote repo 預設使用 `visiocirkit-library`，若不存在可詢問後建立。
4. Sync 不應在未登入、未授權、未選擇 storage policy 時自動 create repo。

## GitHub Storage Schema 建議

使用者 schematic work repo：

```text
/
  README.md                         # optional, auto-generated only with user confirmation
  circuits/
    my-filter.tex
    buck-converter.tex
  .visiocirkit/
    manifest.json
```

`manifest.json` 可記錄：

```json
{
  "schemaVersion": 1,
  "app": "VisioCirkit",
  "filesRoot": "circuits",
  "updatedAt": "2026-07-31T00:00:00.000Z"
}
```

Custom library repo：

```text
visiocirkit-library/
  README.md
  .visiocirkit-library.json
  categories.json
  symbols/
    <symbolId>.json
```

`categories.json`：

```json
[
  {
    "name": "My Components",
    "symbolIds": ["custom-opamp", "custom-filter"]
  }
]
```

`symbols/<symbolId>.json`：

```json
{
  "schemaVersion": 1,
  "id": "custom-opamp",
  "tikzName": "customopamp",
  "displayName": "Custom Op Amp",
  "componentXml": "...",
  "symbols": {},
  "updatedAt": 1785446400000
}
```

Schema 原則：

- 所有檔案都要有 `schemaVersion` 或由 repo manifest 指定版本。
- Remote merge 不能只靠 timestamp；timestamp 可做 happy path，但 conflict 時仍要保留 remote SHA。
- JSON 檔要盡量 deterministic stringify，減少 commit diff noise。
- Work `.tex` 檔與 custom symbol JSON 不要混在同一個 repo，除非使用者明確選擇 advanced mode。

## OAuth App vs GitHub App

### OAuth App

優點：

- 實作較快，authorization code flow 與目前設計相容。
- 可用 `repo` scope 讀寫使用者 private/public repo。
- 可直接使用 `/user/repos` 建 repo、repo contents API 存檔。

缺點：

- `repo` scope 權限很廣。GitHub 文件說明 `repo` 包含 public/private repositories 的完整存取，還包含一些 organization-owned resources 的管理能力。
- 使用者授權頁會顯示 broad permission，信任門檻高。
- Token 權限不 fine-grained；如果 session cookie 或 server secret 出問題，blast radius 大。

### GitHub App

優點：

- Fine-grained permissions，可要求 Contents write、Metadata read 等必要權限。
- 使用者/organization 可選擇安裝到哪些 repos。
- GitHub 官方建議優先考慮 GitHub App，因為 repository access control 更細、token 通常更短命。

缺點：

- 實作複雜度較高，需要 App registration、installation flow、user access token 或 installation token。
- Repo creation UX 可能不同；若要自動建立 arbitrary user repo，需另行確認 GitHub App 權限與 API 限制。
- 初期開發與本機測試比 OAuth App 多一些 setup。

建議：

- MVP 可先用 OAuth App，但 production readiness checklist 必須明確標示 `repo` scope 的風險。
- Public launch 前重新評估 GitHub App。如果核心功能只需要指定 repo 的 contents read/write，GitHub App 是更好的長期模型。

## Security Model

### Assets

- GitHub access token 或 GitHub App token。
- HttpOnly session cookie。
- 使用者 private repository content。
- Custom symbol library JSON，其中可能包含使用者研究或專案資訊。
- Server env secrets：`GITHUB_CLIENT_SECRET`、`AUTH_COOKIE_SECRET`、deployment token。

### Trust Boundaries

- Browser UI：不可信任，所有 input 都要 server-side validation。
- Same-origin API：可信任執行環境，但仍需驗證 session、CSRF、Origin。
- GitHub API：外部 API，需處理 rate limit、permission failure、network failure。
- User-selected repo/path/name：攻擊者可控 input，不能直接拼接成任意 GitHub path。

### Required Controls

Authentication：

- 使用 OAuth authorization code flow。
- `state` 必須是不可預測 random string，server callback 要比對 state cookie。
- 建議加入 PKCE。GitHub OAuth docs 將 `code_challenge` / `code_verifier` 標成 strongly recommended。
- Callback `redirect_uri` 必須和 GitHub OAuth App 設定一致；production 要用 HTTPS origin。
- 每次 token exchange 後呼叫 `/user` revalidate identity，避免帳號切換造成資料混用。

Token handling：

- Browser 不可接觸 GitHub access token。
- 不要用 query string 回傳 token。
- 不要存 token 到 `localStorage`、`sessionStorage` 或 IndexedDB。
- Token 只存在 server-side encrypted session cookie 或 server-side session store。
- `AUTH_COOKIE_SECRET` 必須夠長且可 rotate；不能 fallback 到短 secret。

Cookie：

- Production cookie 使用 `HttpOnly; Secure; SameSite=Lax; Path=/`。
- 若部署架構允許，優先使用 `__Host-` prefix，避免 Domain cookie 被 sibling subdomain 影響。
- Localhost dev 可允許 non-Secure cookie，但 production 不可。
- Logout 要清除 session cookie 與 state cookie。

CSRF：

- SameSite=Lax 是防線之一，但不應是唯一防線。
- State-changing endpoints，例如 `/api/github/user/repos`、`PUT /api/github/repos/.../contents/...`、delete file，應檢查 `Origin` / `Referer`。
- 建議加入 signed double-submit CSRF token 或 same-origin custom header。
- 所有 state-changing API 只允許 POST/PUT/PATCH/DELETE，不允許 GET mutation。

Path / repo validation：

- Repo full name 必須 parse 成 `{owner, repo}`，不可直接信任 arbitrary string。
- File path 限制在 allowlisted root，例如 `circuits/`、`symbols/`、`categories.json`。
- 禁止 `..`、leading slash、control chars、`.github/workflows/`。
- 檔名建議限制副檔名：work 只能 `.tex`，symbols 只能 `.json`。

GitHub permissions：

- OAuth MVP 若使用 private repo，會需要 `repo` scope；UI 要透明告知權限範圍。
- 若只支援 public repo，可評估 `public_repo`，但產品能力會受限。
- GitHub App 長期建議權限：Metadata read、Contents read/write；若要管理 repo settings 或建立 repo，再另外評估 Administration 權限。

Data privacy：

- 預設建立 private `visiocirkit-library`。
- 新建 schematic repo 時預設 private，並在 UI 明確顯示。
- 不在 VisioCirkit server database 永久保存使用者 schematic content；server 只 proxy 當次請求。
- 不記錄 GitHub token、repo content、完整 `.tex` 到 logs。

Rate limit / abuse：

- Server proxy 要限制 request size。
- Save / sync 使用 debounce。
- 對同一 session 的 repo listing / tree request 做短期 cache。
- 對 API proxy path 做 allowlist，不要做任意 GitHub open proxy。

## Deployment Changes

需要新增或確認：

- `npm run build:github-vc`：build 後將 `dist/index.html` pin 到 `<meta name="circuitikz-runtime" content="github-vc">`。
- `api/auth/github`：serverless route，產生 state，redirect 到 GitHub。
- `api/auth/github/callback`：驗證 state，exchange token，寫 session cookie。
- `api/auth/session`：回傳 `{ authenticated, user }`，未登入回 401 或 200 + authenticated false，前端要一致處理。
- `api/auth/logout`：清 cookie。
- `api/github/*`：same-origin GitHub API proxy，附 GitHub token，但必須 allowlist path/method。
- `api/latex`：維持現有 serverless proxy。

Production env：

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
AUTH_COOKIE_SECRET
APP_BASE_URL=https://<github-vc-domain>
```

GitHub OAuth App：

```text
Homepage URL: https://<github-vc-domain>
Authorization callback URL: https://<github-vc-domain>/api/auth/github/callback
```

Vercel / hosting：

- 建議使用獨立 project，例如 `visiocirkit-github-vc`。
- 不與 static demo 共用 OAuth callback domain，降低 cache/runtime 混淆。
- Preview deployments 若要測 OAuth，需要額外 OAuth App 或固定 preview callback strategy；OAuth App callback URL 數量有限制，GitHub App 在這點較彈性。

## UX Requirements

登入前：

- 顯示 GitHub login icon。
- `/api/auth/session 401` 不應顯示為錯誤 toast；只代表未登入。
- 不啟動 repo list、library sync、GitHub template load。

登入中：

- GitHub callback failure 要顯示可讀訊息：missing env、state mismatch、permission denied、token exchange failed。
- 使用者 cancel authorization 時回到 app 並保留 local work。

登入後：

- 顯示 avatar / username。
- Repo selector 有狀態：loading、empty、selected、create failed、permission denied。
- Save 按鈕若未選 repo，提示「Select or create a GitHub repo first」。
- Create repo 要明確顯示 private/public 選項，預設 private。
- Logout 後清除 active repo UI state，但不要刪 local IndexedDB cache。

## Work 儲存策略

建議採「每次 Save 產生一個 Git commit」：

- Commit message 預設 `Update <filename>`。
- 進階：讓使用者輸入 commit message。
- 儲存前取得 latest SHA。
- 若 SHA mismatch，顯示 conflict resolution。
- 不做 silent overwrite。

Load data：

- 初次選 repo 後，掃描 `circuits/**/*.tex` 或 root `.tex`。
- 若 repo 沒有 `.visiocirkit/manifest.json`，視為 generic repo：只列出 `.tex`，不自動寫 manifest，除非使用者儲存或確認初始化。
- 若 repo 有 manifest，依 manifest 的 `filesRoot` 列表顯示。

## Implementation Checklist

Phase 1：安全 OAuth baseline

- [ ] Server-side OAuth routes。
- [ ] State cookie validation。
- [ ] PKCE support。
- [ ] Encrypted HttpOnly session cookie。
- [ ] `/api/auth/session` tolerant frontend handling。
- [ ] Logout clears cookies。

Phase 2：GitHub proxy hardening

- [ ] Allowlist proxy paths and methods。
- [ ] Origin / Referer / CSRF token check on state-changing routes。
- [ ] Request body size limits。
- [ ] No token/content logging。
- [ ] Error mapping for 401/403/404/409/422/rate limit。

Phase 3：Repo UX

- [ ] Repo list after authenticated session only。
- [ ] Create repo prompt with private default。
- [ ] Active repo persisted as non-secret preference。
- [ ] Empty/no repo state。

Phase 4：Work storage

- [ ] GitHubTemplateDataSource uses same-origin proxy, not direct `api.github.com` from browser。
- [ ] Path allowlist。
- [ ] SHA cache and conflict resolution。
- [ ] Commit message UX。

Phase 5：Custom library sync

- [ ] Sync starts only after authenticated session。
- [ ] `visiocirkit-library` create requires user confirmation。
- [ ] Deterministic JSON。
- [ ] Conflict policy documented。
- [ ] Debounced push with visible sync state。

Phase 6：Deployment

- [ ] Separate `github-vc` hosting project。
- [ ] Env vars configured。
- [ ] OAuth callback URL exact。
- [ ] Security headers。
- [ ] `npm run build:github-vc` + artifact verifier。
- [ ] Manual login/save/load test。

## Verification Plan

Automated：

- OAuth callback exchanges mock code and sets HttpOnly session cookie。
- State mismatch rejects callback。
- Missing env returns actionable error。
- Session endpoint returns authenticated profile with valid cookie。
- GitHub proxy rejects unauthenticated request。
- GitHub proxy rejects disallowed path/method。
- Template data source handles list/read/save/delete using SHA。
- Save conflict maps 409 to user-facing conflict state。
- Custom symbol sync skips when unauthenticated。

Manual：

1. Production-like HTTPS preview opens `github-vc` runtime。
2. Click GitHub icon，redirects to GitHub authorization page。
3. Approve app，callback returns to app。
4. Avatar and repo selector appear。
5. Create private repo。
6. Save a `.tex` work file。
7. Confirm GitHub commit exists。
8. Reload / hard refresh，load saved file from GitHub。
9. Create custom symbol，confirm JSON appears in `visiocirkit-library`。
10. Logout，verify session cookie cleared and GitHub API calls return unauthenticated state。

## Open Decisions

- OAuth App MVP 是否接受 `repo` scope 的 broad access，或直接投入 GitHub App。
- Work repo schema 使用 root `.tex` 還是 `circuits/` folder。
- 是否自動建立 `visiocirkit-library`，或第一次 sync 前要求使用者確認。
- Conflict resolution UX：overwrite、save as copy、manual merge 哪些要 MVP 支援。
- 是否要支援 organization repos；若支援，需要 repo list filtering、permission messaging、可能的 org OAuth policy failure handling。
- Session lifetime：目前草案為 7 天，是否要縮短或加入 explicit renewal。

## 參考資料

- GitHub Docs: Authorizing OAuth apps  
  https://docs.github.com/en/enterprise-cloud@latest/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps
- GitHub Docs: Scopes for OAuth apps  
  https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps
- GitHub Docs: REST API repository contents  
  https://docs.github.com/en/rest/repos/contents
- GitHub Docs: Choosing permissions for a GitHub App  
  https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app
- OWASP Cheat Sheet: Cross-Site Request Forgery Prevention  
  https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
