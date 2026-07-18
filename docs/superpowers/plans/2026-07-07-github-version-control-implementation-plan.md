# GitHub Version Control Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement GitHub authentication, Git version control for schematic drawing files, and background synchronization for custom component libraries under a new runtime preset to unify local development, demo sandboxes, and cloud storage in a single branch.

**Architecture:** Client-side API-driven model using a lightweight backend OAuth proxy in `server.js`, a browser-based GitHub REST client, a new `GitHubTemplateDataSource` for drawing persistence, and a debounced background synchronizer for the `visiocirkit-library` repository.

**Tech Stack:** TypeScript, Node.js, Octokit/REST, IndexedDB.

## Global Constraints
- Avoid code/branch divergence; all presets (server, demo, github-vc) must live on the same codebase.
- File storage and components sync must be non-blocking and use local storage/IndexedDB cache where applicable.
- All communications are in Traditional Chinese, technical terms in English, and no Chinese characters in filenames.

---

### Task 1: Add GitHub OAuth Backend Proxy

**Files:**
- Modify: `server.js`
- Test: `tests/oauthProxy.test.ts`

**Interfaces:**
- Produces: `/api/auth/github` redirecting to GitHub OAuth, and `/api/auth/github/callback` exchanging code for `access_token` and redirecting back to the app with the token.

- [ ] **Step 1: Write integration test for OAuth callback proxy**
  Create `tests/oauthProxy.test.ts` to test the callback route with mock query arguments and a mocked GitHub token response:
  ```typescript
  import { describe, it, expect, vi } from "vitest"
  import http from "http"
  
  describe("OAuth Proxy Callback Endpoint", () => {
  	it("exchanges authorization code for an access token", async () => {
  		// Test logic to verify endpoint behavior
  	})
  })
  ```
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test tests/oauthProxy.test.ts`
  Expected: FAIL (routes not found or server.js does not handle auth paths)
- [ ] **Step 3: Implement OAuth proxy routes in `server.js`**
  Modify `server.js` to process requests for `/api/auth/github` and `/api/auth/github/callback`:
  ```javascript
  // server.js updates for OAuth endpoints
  const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  
  if (pathname === '/api/auth/github') {
    res.writeHead(302, { Location: `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=repo` });
    res.end();
  } else if (pathname === '/api/auth/github/callback') {
    // Perform code exchange and redirect back to client root with token
  }
  ```
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run test tests/oauthProxy.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add server.js tests/oauthProxy.test.ts
  git commit -m "feat(auth): add backend OAuth proxy endpoints"
  ```

---

### Task 2: Implement `github-vc` Runtime Preset & `AuthService`

**Files:**
- Modify: `src/scripts/config/runtimeConfig.ts`
- Modify: `src/scripts/config/runtimeBootstrap.ts`
- Create: `src/scripts/services/authService.ts`
- Test: `tests/authService.test.ts`

**Interfaces:**
- Consumes: None
- Produces: `AuthService` class with methods `getToken()`, `saveToken(token)`, `clearToken()`, `getUserProfile()`.

- [ ] **Step 1: Write unit test for `AuthService` token management**
  Create `tests/authService.test.ts` containing:
  ```typescript
  import { describe, it, expect } from "vitest"
  import { AuthService } from "../src/scripts/services/authService"
  
  describe("AuthService", () => {
  	it("manages OAuth tokens correctly", () => {
  		const service = new AuthService()
  		service.saveToken("mock-token")
  		expect(service.getToken()).toBe("mock-token")
  		service.clearToken()
  		expect(service.getToken()).toBeNull()
  	})
  })
  ```
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test tests/authService.test.ts`
  Expected: FAIL
- [ ] **Step 3: Implement `github-vc` preset configuration and `AuthService`**
  Add `"github-vc"` to `RuntimePreset` inside [runtimeBootstrap.ts](file:///c:/Users/iMonet/Projects/antigravity/VisioCirkit/src/scripts/config/runtimeBootstrap.ts).
  Create `src/scripts/services/authService.ts`:
  ```typescript
  export class AuthService {
  	public saveToken(token: string): void {
  		localStorage.setItem("git_oauth_token", token)
  	}
  	public getToken(): string | null {
  		return localStorage.getItem("git_oauth_token")
  	}
  	public clearToken(): void {
  		localStorage.removeItem("git_oauth_token")
  	}
  	public async getUserProfile(): Promise<any> {
  		// Call api.github.com/user
  	}
  }
  ```
- [ ] **Step 4: Run test to verify it passes**
  Run: `npm run test tests/authService.test.ts`
  Expected: PASS
- [ ] **Step 5: Commit**
  ```bash
  git add src/scripts/config/runtimeConfig.ts src/scripts/config/runtimeBootstrap.ts src/scripts/services/authService.ts tests/authService.test.ts
  git commit -m "feat(auth): support github-vc preset and add AuthService"
  ```

---

### Task 3: Implement `GitHubTemplateDataSource`

**Files:**
- Create: `src/scripts/services/githubTemplateDataSource.ts`
- Modify: `src/scripts/services/appRuntime.ts`
- Test: `tests/githubTemplateDataSource.test.ts`

**Interfaces:**
- Consumes: `TemplateDataSource` from [templateTypes.ts](file:///c:/Users/iMonet/Projects/antigravity/VisioCirkit/src/scripts/services/templateTypes.ts)
- Produces: `GitHubTemplateDataSource` class implementing `TemplateDataSource`.

- [ ] **Step 1: Write test for `GitHubTemplateDataSource`**
  Create `tests/githubTemplateDataSource.test.ts` testing `listFiles`, `readFile`, and `saveWork` using a mocked Octokit response.
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test tests/githubTemplateDataSource.test.ts`
  Expected: FAIL
- [ ] **Step 3: Implement `GitHubTemplateDataSource` class**
  Create `src/scripts/services/githubTemplateDataSource.ts` implementing `TemplateDataSource`. Map CRUD calls to the GitHub Repository Contents API.
- [ ] **Step 4: Update `appRuntime.ts` to return `GitHubTemplateDataSource` in `github-vc` mode**
  Modify [appRuntime.ts](file:///c:/Users/iMonet/Projects/antigravity/VisioCirkit/src/scripts/services/appRuntime.ts) to resolve `GitHubTemplateDataSource` if `config.storageMode === "github"`.
- [ ] **Step 5: Run test to verify it passes**
  Run: `npm run test tests/githubTemplateDataSource.test.ts`
  Expected: PASS
- [ ] **Step 6: Commit**
  ```bash
  git add src/scripts/services/githubTemplateDataSource.ts src/scripts/services/appRuntime.ts tests/githubTemplateDataSource.test.ts
  git commit -m "feat(storage): implement GitHubTemplateDataSource"
  ```

---

### Task 4: Implement Custom Component Sync Service

**Files:**
- Create: `src/scripts/services/githubCustomSymbolSyncService.ts`
- Modify: `src/scripts/services/appRuntime.ts`
- Test: `tests/githubCustomSymbolSyncService.test.ts`

**Interfaces:**
- Consumes: `CustomSymbolRepository` from [customSymbolRepository.ts](file:///c:/Users/iMonet/Projects/antigravity/VisioCirkit/src/scripts/services/customSymbolRepository.ts)
- Produces: `GithubCustomSymbolSyncService` syncing categories and symbols with `visiocirkit-library` repository in the background.

- [ ] **Step 1: Write unit tests for library sync merging logic**
  Create `tests/githubCustomSymbolSyncService.test.ts` testing automatic synchronization (timestamp resolution between IndexedDB and mock library JSONs).
- [ ] **Step 2: Run test to verify it fails**
  Run: `npm run test tests/githubCustomSymbolSyncService.test.ts`
  Expected: FAIL
- [ ] **Step 3: Implement `GithubCustomSymbolSyncService` class**
  Write logic to check for the repository `visiocirkit-library` and sync local database records to/from it. Implement a debounced commit pipeline for symbol creation/modifications.
- [ ] **Step 4: Hook the Sync Service into App Bootstrapping**
  Initialize and start the sync loop on app start if in `github-vc` mode.
- [ ] **Step 5: Run test to verify it passes**
  Run: `npm run test tests/githubCustomSymbolSyncService.test.ts`
  Expected: PASS
- [ ] **Step 6: Commit**
  ```bash
  git add src/scripts/services/githubCustomSymbolSyncService.ts src/scripts/services/appRuntime.ts tests/githubCustomSymbolSyncService.test.ts
  git commit -m "feat(sync): implement custom components sync service"
  ```

---

### Task 5: Integrate UI for Presets and Authentication

**Files:**
- Modify: `src/pages/index.html`
- Modify: `src/scripts/main.js` (or primary entrypoint controller)
- Test: Manual Verification

**Interfaces:**
- Consumes: `AuthService`, `GitHubTemplateDataSource`
- Produces: Visual login buttons, repo selectors, commit prompts, and library sync state indicator in the UI.

- [ ] **Step 1: Add HTML template components for GitHub auth and repo selector**
  Update `src/pages/index.html` to add user profile buttons, dropdown selectors, and auth modals.
- [ ] **Step 2: Bind UI events and actions in `src/scripts/main.js`**
  Modify main controller files to wire up OAuth login, repo selection, and commit message prompt triggers.
- [ ] **Step 3: Add `build:github-vc` script in `package.json`**
  Add build target scripts to build preset artifacts.
- [ ] **Step 4: Verify local development, demo preset, and github-vc preset builds**
  Ensure all three build setups generate correct distribution bundles (`npm run build:demo` and `npm run build:github-vc`).
- [ ] **Step 5: Commit**
  ```bash
  git add src/pages/index.html src/scripts/main.js package.json
  git commit -m "feat(ui): connect UI actions and add github-vc build script"
  ```
