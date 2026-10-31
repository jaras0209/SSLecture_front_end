# TODO：後端串接待辦清單

> **建立時間**：2026-08-12
> **最後更新**：2026-10-31（加入可見範圍規則、性別、家長綁定、我的授課、帳號清理、社群帳號、錯誤碼）
> **目的**：追蹤前端 Mock 實作中，待後端 Spring Boot 就緒後需實作或替換的所有項目
> **參考文件**：
> - [`docs/backend_api_spec.md`](./docs/backend_api_spec.md)（v1.6.0：API、可見範圍規則、錯誤碼、第 13 節 Store → API 對照）
> - [`docs/database_schema.md`](./docs/database_schema.md)（v1.7.0：資料表、5.10–5.13 設計決策）
> - [`docs/oauth2_social_login_spec.md`](./docs/oauth2_social_login_spec.md)（社群登入流程）

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
- [ ] 後端 `application.yml` 確認 `app.frontend.callback-url` 設為（HTML5 History 模式）：
  ```
  app.frontend.callback-url: ${FRONTEND_URL}/login/callback
  ```

---

## ⚠️ 上線前必須由後端處理（安全性）

目前所有資料與權限檢查都只在瀏覽器裡，任何人都能改 localStorage 繞過。後端上線時：

- [ ] **密碼**：前端 mock 以明文存在 localStorage（`superstart_users_db.passwordHash`）；後端一律 bcrypt 雜湊，
  前端改走 `POST /auth/login`，不再保存任何密碼
- [ ] **可見範圍規則**在後端每個學員相關 API 套用（`docs/backend_api_spec.md`〈可見範圍規則〉，前端 `src/utils/scope.ts`）：
  - [ ] 教師只看同教會、同性別學員；任一方未設定性別時看不到
  - [ ] 牧者看同教會全部；admin / SS 中央看全部；家長只看綁定的孩子；學員只看自己
  - [ ] 講師例外：連結帳號的講師在**自己授課的預約**中看得到全部學員
  - [ ] 教師管理的預約中看不到的學員只回傳 `hiddenAttendeeCount`，不回姓名
- [ ] **寫入檢查**：指派輔導教師須通過 `canMentor`（否則 `403 STUDENT_NOT_VISIBLE`）；講師只能改 `attendanceStatus`
  且需時間已確認（否則 `409 BOOKING_NOT_CONFIRMED`）；只有同教會牧者或 admin 能設定性別、綁定家長
- [ ] **邀請碼**在後端驗證與作廢（前端 `validateInviteCode` / `consumeInviteCode` 只是 mock）
- [ ] 正式環境把 `VITE_DEMO_MODE` 設為 `false`，並移除 `auth.ts` 內建的示範帳號（密碼皆為 123456）

---

## 資料庫 Migration（後端工程師負責）

- [ ] 依 `docs/database_schema.md` v1.7.0：
  - [ ] `users` 新增 `gender user_gender NULL`（只用於 student / teacher）
  - [ ] `users.password_hash` 改為可為 NULL（社群登入帳號沒有密碼）
  - [ ] 新增 `parent_children`，並把 `student_assignments.parent_id` 搬過去後刪除該欄（遷移 SQL 見 2.19）
  - [ ] `booking_sessions.teacher_id` 改為 `ON DELETE RESTRICT`；新增 `idx_booking_sessions_lecturer`
  - [ ] `lecturers.linked_user_id` 只允許連結 `teacher` / `pastor`（應用端檢查）

- [ ] 建立 `social_accounts` 資料表（DDL 見 docs/oauth2_social_login_spec.md Section 5.6）
- [ ] `users` 表新增欄位：
  ```sql
  ALTER TABLE users
    ADD COLUMN email          VARCHAR(255) UNIQUE,
    ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;
  ```
- [x] 更新 `docs/database_schema.md` Section 2、Section 6 DDL、Section 8 ERD（已含 social_accounts，目前 v1.7.0）

---

## 前端 Store / Mock 替換（前端工程師負責）

### src/stores/courses.ts & src/mocks/courses.ts

- [ ] 將 `src/stores/courses.ts` 中的 `buildMockCourses()` 替換為後端 `GET /courses` API 呼叫
- [ ] 後端課程 API 穩定後移除 `src/mocks/courses.ts`

### src/stores/auth.ts — exchangeOAuthCode 函式

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

- [ ] 完成後由後端建立正式帳號（`password_hash` 為 NULL）；前端 mock 目前以 `saveSocialAccount()` 寫入 `usersDb` 模擬，
  串接後移除該函式與啟動時補建紀錄的區塊
- [ ] 同一個 Google / LINE 帳號再次登入要回到同一位使用者（mock 每次都產生新的 `oauth_*` 帳號）

### 本期新增功能的 API 串接（前端工程師負責）

各 store 函式對應的 API 見 `docs/backend_api_spec.md` 第 13 節。

- [ ] 使用者與性別：`authStore.setGender()` → `PUT /users/:username/gender`；`/auth/me`、`/admin/users` 回傳 `gender`、`loginMethod`
- [ ] 家長綁定：`bindChild()` / `unbindChild()` / `parentsOf()` / `childrenOf()` → `/parents/:parentUsername/children`、`/students/:studentUsername/parents`
- [ ] 關懷指派：`/assignments` 已不含 `parent`；處理 `403 STUDENT_NOT_VISIBLE`
- [ ] 刪除帳號 / 變更角色：`AdminUserTable` 改呼叫 `DELETE` / `PUT /admin/users/:username`，用回應的 `cleanup` 筆數顯示提示，
  移除前端的 `useAccountCleanup()`、`cancelOpenSessionsOf()`、`releaseCaretaker()`、`unlinkLecturerAccount()`、`releaseStudent()`
- [ ] 我的授課：`useMyLectures()` 改用 `GET /bookings/sessions?lecturerUsername=&includeAttendees=true`；
  出席記錄走 `PATCH /bookings/sessions/:id/attendees/:username`（處理 `409 BOOKING_NOT_CONFIRMED`）
- [ ] 教會預約總覽（牧者）：`TeacherChurchBookings` 改用 `GET /bookings/sessions?church=`
- [ ] 教師的預約面板：使用回應的 `hiddenAttendeeCount`，不再由前端過濾學員
- [x] 錯誤訊息：`src/utils/api.ts` 依 `error.code` 顯示目前語系的訊息（`api.codes.*`，`VALIDATION_ERROR` 沿用後端訊息）；
  `src/i18n/__tests__/apiCodes.spec.ts` 確保 API 規格第 12 節的每個錯誤碼都有中英文訊息

### 既有資料搬遷

- [ ] 決定是否要把示範站 localStorage 的資料（`superstart_*` 鍵）匯入後端；若要，需寫一次性匯入腳本，
  密碼一律重設（不要匯入明文密碼）

### loginWithThirdParty（已完成）

- [x] 確認沒有任何地方仍在呼叫 loginWithThirdParty
- [x] 移除整個 loginWithThirdParty 函式（已標記 @deprecated）
- [x] 從 return 物件中移除 loginWithThirdParty export

### 統一 API Fetch Wrapper（已完成）

- [x] 建立 `src/utils/api.ts`：集中 HTTP 請求、JWT header 注入、401 refresh 骨架
  - `apiGet / apiPost / apiPut / apiPatch / apiDelete` 已備妥
  - `refreshToken()` 已預寫，後端就緒後取消註解即可
  - `ApiError` 型別已定義，供 store 使用

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
- [ ] 社群帳號以密碼登入：回傳 `401 USE_SOCIAL_LOGIN`
- [ ] 男女分開：男教師查名冊、預約邀請名單都看不到女學員；未設定性別的教師看不到任何學員；牧者看得到全部
- [ ] 指派異性學員給教師：`403 STUDENT_NOT_VISIBLE`
- [ ] 講師（教師或牧者連結）：在自己授課的預約看得到男女學員並可記錄出席；時間未確認時 `409 BOOKING_NOT_CONFIRMED`
- [ ] 刪除教師：其指派解除、講師連結解除、未進行的預約取消並附原因；已完成的預約與統計保留
- [ ] 教師與牧者互換角色：講師連結保留
- [ ] 家長只看得到綁定的孩子；解除綁定後立即看不到

---

## 文件更新

- [x] docs/database_schema.md：social_accounts 表、ERD（目前 v1.7.0，另含 gender、parent_children、5.10–5.13）
- [x] docs/backend_api_spec.md：可見範圍規則、性別、家長綁定、我的授課、帳號清理、錯誤碼（v1.6.0）
- [x] README.md：更新目錄結構、i18n/測試/Lint 說明、登入方式與後端部署需求（環境變數清單）

---

## 部署注意事項

- [ ] HTML5 路由下，伺服器需配置 fallback（所有非 API 路徑返回 index.html）
  - Nginx 範例：try_files $uri $uri/ /index.html;
- [ ] 確認生產環境 CORS 設定（application.yml 的 allowed-origins）
- [ ] 確認 HTTPS（LINE OAuth 要求 HTTPS）

---

*此文件由系統自動生成，請在後端串接過程中持續更新狀態。*
