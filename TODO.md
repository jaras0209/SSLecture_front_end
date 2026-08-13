# TODO：OAuth2 後端串接待辦清單

> **建立時間**：2026-08-12
> **目的**：追蹤前端 OAuth2 Mock 實作中，待後端 Spring Boot 就緒後需替換的所有項目
> **參考文件**：[`docs/oauth2_social_login_spec.md`](./docs/oauth2_social_login_spec.md)

---

## 狀態說明

| 符號 | 意義 |
|------|------|
| `[ ]` | 待辦 |
| `[/]` | 進行中 |
| `[x]` | 已完成 |

---

## 後端環境設定（後端工程師負責）

- [ ] 在 Google Cloud Console 建立 OAuth 2.0 Client ID
  - 加入 Redirect URI：`https://api.sslecture.example.com/login/oauth2/code/google`
  - 加入 Redirect URI（dev）：`http://localhost:8080/login/oauth2/code/google`
- [ ] 在 LINE Developers Console 建立 LINE Login Channel
  - 加入 Callback URL：`https://api.sslecture.example.com/login/oauth2/code/line`
  - 加入 Callback URL（dev）：`http://localhost:8080/login/oauth2/code/line`
  - 申請 Email Address Permission
- [ ] 設定後端環境變數：
  - `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`
  - `LINE_CHANNEL_ID`、`LINE_CHANNEL_SECRET`
  - `JWT_SECRET`（256-bit+，用 `openssl rand -base64 32` 生成）
  - `FRONTEND_URL`（正式環境前端 URL）
  - `REDIS_HOST`（儲存短效 code）
- [ ] 後端 `application.yml` 確認 `app.frontend.callback-url` 設為：
  ```
  app.frontend.callback-url: ${FRONTEND_URL}/#/login/callback
  ```

---

## 資料庫 Migration（後端工程師負責）

- [ ] 建立 `social_accounts` 資料表（DDL 見 docs/oauth2_social_login_spec.md Section 5.6）
- [ ] `users` 表新增欄位：
  ```sql
  ALTER TABLE users
    ADD COLUMN email          VARCHAR(255) UNIQUE,
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
  ```
- [ ] 更新 `docs/database_schema.md` Section 2、Section 6 DDL、Section 8 ERD，版本升至 v1.6.0

---

## 前端 src/stores/auth.ts 替換（前端工程師負責）

### exchangeOAuthCode 函式

- [ ] 移除「=== 開發期 mock ===」區塊（約 10 行）
- [ ] 取消註解真實 fetch 呼叫區塊（已預先寫好，被 TODO 包圍）
- [ ] 確認 safeSet('superstart_access_token', ...) 正確儲存 JWT
- [ ] 確認 safeSet('superstart_refresh_token', ...) 正確儲存 Refresh Token
- [ ] 確認 currentUser.value 欄位對應正確（id, username, role, churchId, avatarUrl）

### completeProfile 函式

- [ ] 移除「=== 開發期 mock ===」區塊（約 15 行）
- [ ] 取消註解真實 fetch 呼叫（PUT /auth/complete-profile）
- [ ] 測試教會選擇正確寫入後端 DB
- [ ] 測試邀請碼升級角色後，重新取得 JWT（角色已更新）

### loginWithThirdParty（可移除）

- [ ] 確認沒有任何地方仍在呼叫 loginWithThirdParty
- [ ] 移除整個 loginWithThirdParty 函式（已標記 @deprecated）
- [ ] 從 return 物件中移除 loginWithThirdParty export

---

## 前端 API 整合驗證

- [ ] POST /auth/exchange：短效 code 換 JWT 正常（60 秒過期測試）
- [ ] PUT /auth/complete-profile：補充教會 + username 正常寫入
- [ ] GET /auth/me：取得登入使用者資料正確（含 role, church）
- [ ] POST /auth/refresh：Refresh Token 換新 Access Token 正常
- [ ] GET /auth/social-accounts：已綁定的社群帳號列表顯示正確
- [ ] DELETE /auth/social-accounts/{provider}：解除綁定正常

---

## 整合測試情境

- [ ] 全新使用者 Google 登入：
  點擊登入 → 同意 → 後端建立帳號 needsOnboarding=true → 前端顯示 onboarding → 選教會 → 導向 Dashboard
- [ ] 全新使用者 LINE 登入（含 email 取不到的情境）
- [ ] 重複 Google 登入（第二次）：直接導向 Dashboard，不顯示 onboarding
- [ ] Google + LINE 同一帳號自動合併（相同 email）
- [ ] 社群登入 + 邀請碼升級角色：onboarding 輸入邀請碼 → 角色變為 teacher
- [ ] 密碼帳號登入：確認不受 OAuth 改動影響
- [ ] JWT 過期自動 refresh：Access Token 過期後，自動呼叫 /auth/refresh
- [ ] 停用帳號：is_active=false 的帳號，OAuth 登入後後端回傳 403

---

## 文件更新

- [ ] docs/database_schema.md：新增 social_accounts 表、更新 ERD、版本升至 v1.6.0
- [ ] README.md：更新登入方式說明，新增後端部署需求（環境變數清單）

---

## 部署注意事項

- [ ] HTML5 路由下，伺服器需配置 fallback（所有非 API 路徑返回 index.html）
  - Nginx 範例：try_files $uri $uri/ /index.html;
- [ ] 確認生產環境 CORS 設定（application.yml 的 allowed-origins）
- [ ] 確認 HTTPS（LINE OAuth 要求 HTTPS）

---

*此文件由系統自動生成，請在後端串接過程中持續更新狀態。*
