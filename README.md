# SSLecture - Shining Star 課程學習與關懷配對管理系統 🌟

SSLecture 是一個基於 **Vue 3 + TypeScript + Vite** 技術棧開發的現代化課程學習與輔導配對管理系統原型。目前前端採用 **Pinia** 全狀態管理配合 **LocalStorage** 持久化，後端將串接 **Spring Boot** 實現完整 OAuth2 JWT 架構。

---

## 📖 專案背景與特色

本系統旨在協助教會或教育機構管理學員的聖經課程學習進度，並搭建「學員 - 輔導教師 - 分區牧者 - 關懷家長」的多元關懷網路，結合了以下特色：
*   **多角色權限控制**：五種角色（管理員、牧者、教師、學員、家長）各司其職，擁有專屬的控制面板。
*   **雙語系即時切換（i18n）**：完整支援繁體中文（`zh-TW`）與英文（`en`），包含介面、驗證訊息與列印報表模板，並自動記憶語系偏好。
*   **精美現代視覺與無障礙體驗**：採用漸層色調、玻璃擬態（Glassmorphism）、ARIA 無障礙標籤與響應式排版。
*   **閃耀計畫檢核與列印匯出**：學員專屬的信仰與生活挑戰追蹤系統，支援專屬列印排版與 PDF 匯出。
*   **課程預約、配對與年度申報**：支援一對一／團體預約、出席與心得回饋追蹤、牧者關懷配對管理，以及教師年度教學人次統計申報。

---

## 🛠️ 技術棧說明

*   **前端核心**：Vue 3.5 (Composition API, `<script setup>`, `defineAsyncComponent` 按需載入)
*   **建置工具**：Vite 7（含 `vue-vendor` 與 `i18n` 獨立 chunk 拆分最佳化）
*   **狀態管理**：Pinia 4（模組化設計：`auth` 權限模組、`courses` 課程與進度模組、`bookings` 預約與出席模組）
*   **多語系架構**：Vue I18n 11（Composition API 模式，`zh-TW` / `en` 雙語系；`en` 語系檔按需載入）
*   **路由管理**：Vue Router 5（HTML5 History 模式，內建角色與頁面限制導航守衛、平滑捲動）
*   **字型**：Quicksand / Outfit 由 `@fontsource` 隨專案打包，不向 Google Fonts 發出請求
*   **測試**：Vitest 5 + Happy DOM + Vue Test Utils（25 個測試檔案、242 項測試，含 composable 與表單元件測試，以及以本機 HTTP 伺服器驗證 `api.ts` 的整合測試）；Playwright 端對端測試（34 項，含以 axe 檢查 WCAG 2.1 AA 無障礙與鍵盤操作）
*   **程式碼品質**：TypeScript 6.0（Strict 嚴格模式，以 vue-tsc 3 檢查）、ESLint 10、Prettier 3
*   **樣式設計**：Vanilla CSS（響應式排版，適配行動端、桌面端與 `@media print` 列印模式）

---

## 📂 專案目錄結構

```text
SSLecture/
├── public/                 # 靜態資源
├── docs/                   # 開發文件
│   ├── backend_api_spec.md          # 後端 API 規格（v1.5.0）
│   ├── database_schema.md           # 資料庫設計文件（PostgreSQL DDL + ERD）
│   └── oauth2_social_login_spec.md  # OAuth2 Google/LINE 登入架構設計
├── e2e/                    # Playwright 端對端測試（*.e2e.ts，對正式 build 執行）
├── src/
│   ├── assets/             # 圖片、樣式等靜態資源
│   │   └── styles/main.css # 全域 CSS（變數、玻璃擬態、通用工具類、列印基礎樣式）
│   ├── components/         # 可複用元件
│   │   ├── admin/          # 管理員後台區塊（新增使用者、使用者列表、教會概況、年度教學統計、邀請碼管理）
│   │   ├── auth/           # 登入頁元件（登入表單、註冊表單、社群登入按鈕、忘記密碼 Modal）
│   │   ├── shared/         # 全域共用元件（AppToast、BaseModal、LanguageSwitcher、ProfileDialog、StatusBadge）
│   │   ├── student/        # 學員專屬子元件（課程卡片、詳情、預約清單、回饋 Modal、閃耀計畫面板）
│   │   └── teacher/        # 教師/牧者專屬子元件（學員清單、進度抽屜、筆記對話框、預約面板、牧者總覽、年度申報、講師與主題設定、講師新增/編輯 Modal）
│   ├── composables/        # 可複用邏輯（Composition API）
│   │   ├── useI18nHelper.ts        # 動態 i18n Key、角色與狀態翻譯輔助函式
│   │   ├── usePasswordStrength.ts  # 密碼強度計算與多語系提示
│   │   ├── useStudentList.ts       # 學員清單過濾、搜尋與進度統計邏輯
│   │   └── useToast.ts             # 全域 Toast 通知與 Confirm 確認框系統
│   ├── i18n/               # 多語系設定與語言包
│   │   ├── index.ts        # Vue I18n 實例與 setLocale 切換函式
│   │   └── locales/        # 語系 JSON 檔（zh-TW.json、en.json）
│   ├── mocks/              # 開發期預設資料（後端就緒後可替換）
│   │   └── courses.ts      # 30 堂課程預設清單產生器（buildMockCourses）
│   ├── router/
│   │   ├── index.ts        # 路由配置與導航守衛（lazy loading、角色與頁面權限守衛）
│   │   └── __tests__/      # 路由導航守衛單元測試（router.spec.ts）
│   ├── stores/             # Pinia 狀態管理
│   │   ├── auth.ts         # 使用者驗證、邀請碼管理與 OAuth2 actions
│   │   ├── courses.ts      # 課程、學習進度、閃耀計畫、講師與關懷配對關係
│   │   ├── bookings.ts     # 課程預約、出席紀錄與雙向心得回饋
│   │   └── __tests__/      # Store 單元測試（auth / courses / bookings.spec.ts）
│   ├── types/              # TypeScript 型別集中管理
│   │   ├── auth.ts         # User、UserRole、InviteCode 等
│   │   ├── courses.ts      # Course、ListenSession、ShiningProject、Lecturer 等
│   │   ├── bookings.ts     # BookingSession、AttendeeEntry 等
│   │   ├── student.ts      # StudentProgressSummary 等學員進度摘要型別
│   │   └── index.ts        # 統一 barrel export
│   ├── utils/
│   │   ├── storage.ts      # localStorage 安全讀寫包裝工具（safeGet / safeSet）
│   │   ├── api.ts          # 集中式 API fetch wrapper（JWT 注入、401 refresh、逾時／取消、i18n 錯誤訊息）
│   │   ├── datetime.ts     # 本地時間 / ISO 時間戳記轉換與依語系顯示
│   │   ├── id.ts           # 不會碰撞的隨機 ID 產生器
│   │   ├── avatar.ts       # 在瀏覽器內產生 DiceBear 頭像（按需載入各風格）
│   │   ├── persist.ts      # store 狀態延遲合併寫入 localStorage，並與其他分頁同步
│   │   └── __tests__/      # 工具函式單元與整合測試（storage / datetime / id / avatar / persist / api）
│   ├── views/              # 各角色的控制面板主頁面
│   │   ├── AdminDashboard.vue      # 系統管理員後台（帳號權限、邀請碼、年度統計總覽）
│   │   ├── LoginView.vue           # 登入與註冊介面（含邀請碼驗證、Google/LINE 登入、快速測試帳號）
│   │   ├── LoginCallback.vue       # OAuth2 回調頁（換取 JWT、錯誤處理）
│   │   ├── NotFoundView.vue        # 404 找不到頁面
│   │   ├── OnboardingView.vue      # 首次社群登入補充資料頁
│   │   ├── StudentDashboard.vue    # 學員個人學習面板 & 閃耀計畫
│   │   ├── TeacherDashboard.vue    # 輔導教師 / 分區牧者 / 家長共用控制面板
│   │   └── UnauthorizedView.vue    # 未授權提示頁
│   ├── App.vue             # 根元件（頂部導覽列、語系切換器、Toast、個人資料與密碼修改 Modal）
│   ├── main.ts             # 專案入口（Pinia、Router、i18n 掛載與全域錯誤捕獲）
│   └── vite-env.d.ts       # Vite 環境變數型別宣告
├── .env.example            # 環境變數範本（複製為 .env.development 使用）
├── .env.development        # 開發環境變數（VITE_API_BASE_URL 等）
├── .env.production         # 生產環境變數
├── playwright.config.ts    # Playwright 設定（自動 build 並以 vite preview 啟動）
├── eslint.config.js        # ESLint Flat Config 配置
├── .prettierrc             # Prettier 格式化配置
├── TODO.md                 # 後端串接待辦清單
├── index.html              # HTML 模板入口
├── package.json            # 依賴套件與指令腳本
├── tsconfig.json           # TypeScript 配置
├── vitest.config.ts        # Vitest 測試配置（含 coverage）
└── vite.config.ts          # Vite 建置配置（含 vendor / i18n chunk splitting）
```

---

## 🔑 登入方式

### 1. 帳號密碼登入

在登入頁輸入帳號與密碼。可使用以下預設測試帳號（**密碼皆為 `123456`**）：

| 角色 | 預設帳號 | 核心功能 |
| :--- | :--- | :--- |
| **系統管理員** | `admin` | 檢視各教會數據與年度申報總覽、管理使用者角色與註冊權限、限制特定用戶的頁面存取、產生與撤銷邀請碼。 |
| **分區牧者** | `pastor` | 專屬「教會配對管理板」，分配輔導教師與學員的關懷對象，管理關懷家長配對與講師名冊。 |
| **輔導教師** | `teacher` | 檢視被指派學員的課程進度、審核閃耀計畫並匯出列印、管理聽課預約與出席、填寫年度教學人次申報。 |
| **學員** | `student` | 瀏覽聖經與專題課程、登記聽課紀錄與個人心得筆記、管理預約、填寫「閃耀計畫」。 |
| **關懷家長** | `parent` | 查看與其綁定之子女（學員）的聽課紀錄、學習進度百分比與閃耀計畫。 |

### 2. 邀請碼註冊機制

公開註冊頁預設僅能註冊為 **學員** 角色。若需註冊為教師、牧者、家長或管理員，必須由現有管理員登入「Admin 控制面板」產生對應角色的 **邀請碼**。被邀請者在註冊時輸入邀請碼，系統將自動鎖定其角色與教會。

### 3. 社群平台登入（Google / LINE）

> ⚠️ 目前為前端 Mock 實作，後端就緒後將實現實際 OAuth2 流程。

登入頁展示 Google / LINE 登入按鈕，點擊後將執行以下流程：

```
點擊按鈕
  ↓
  window.location.href 導向 /oauth2/authorization/google
  ↓ （後端處理 OAuth2 Authorization Code Flow）
  ↓
  回調到 /login/callback?code=XXXXX（LoginCallback.vue）
  ↓
  前端呼叫 POST /auth/exchange 換取 JWT
  ↓
  首次登入 → OnboardingView.vue（選教會 + 可輸入邀請碼）
  已有帳號 → 直接導向 Dashboard
```

詳細流程請參閱 [`docs/oauth2_social_login_spec.md`](./docs/oauth2_social_login_spec.md)。

---

## 🚀 快速上手與環境設定

若要於本機環境執行此專案，請確保電腦已安裝 **Node.js v22 LTS** 以上版本（本專案開發環境為 Node.js v22.19.0）與 npm 套件管理器。

### 1. 安裝專案依賴

開啟終端機並切換至專案根目錄，執行以下指令安裝所需套件（依 `package-lock.json` 安裝固定版本，與 CI 相同）：

```bash
npm ci
```

### 2. 本地開發伺服器啟動

執行以下指令啟動 Vite 開發伺服器，預設會在本機的 `http://localhost:5173` 啟動：

```bash
npm run dev
```

### 3. 單元測試與覆蓋率

本專案使用 Vitest 進行測試（涵蓋 `auth`、`courses`、`bookings` stores、`router` 導航守衛、語系檔編譯檢查，以及 `storage`、`datetime`、`id`、`avatar`、`persist`、`api` 工具函式，共 192 項測試）：

```bash
# 單次執行所有測試
npm run test

# 監聽模式執行測試
npm run test:watch

# 產生測試覆蓋率報告
npm run test:coverage

# 端對端測試（Playwright：自動 build、啟動 vite preview 後以 Chromium 執行）
# 第一次使用前先安裝瀏覽器：npx playwright install chromium
npm run test:e2e
```

E2E 測試涵蓋各角色登入與路由權限、登入／註冊表單、邀請碼註冊、語系切換、學員聽課紀錄與閃耀計畫、教師新增講師、管理員建立帳號與邀請碼，以及頭像與圖示皆在本機產生（不連外部圖片網站）；另有多分頁同步測試（資料、語系、登入／登出在分頁間同步）。CI 與部署流程都會執行，失敗時會上傳 Playwright trace 供除錯。

### 4. 程式碼檢查與格式化

```bash
# ESLint 靜態檢查 / 自動修復
npm run lint
npm run lint:fix

# Prettier 格式檢查 / 自動排版
npm run format:check
npm run format
```

### 5. 專案編譯與預覽

若要執行 TypeScript 型別檢查並將專案打包為生產環境靜態檔案（輸出至 `dist/` 目錄）：

```bash
npm run build
npm run preview
```

---

## ⚙️ 後端部署需求

> 目前前端為 Mock 模式，後端就緒後請依以下說明進行配置。

### 後端環境變數

| 變數名稱 | 說明 |
|------------|------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 密鑰 |
| `LINE_CHANNEL_ID` | LINE Developers Channel ID |
| `LINE_CHANNEL_SECRET` | LINE Channel Secret |
| `JWT_SECRET` | JWT 簽署密鑰（256-bit+，建議用 `openssl rand -base64 32` 生成） |
| `FRONTEND_URL` | 前端部署網址（後端用於 OAuth callback redirect） |
| `REDIS_HOST` | Redis 主機位址（儲存 OAuth 短效 code） |

### 前端環境變數

| 變數名稱 | 說明 | 範例 |
|------------|------|------|
| `VITE_API_BASE_URL` | 後端 Spring Boot API 網址 | `http://localhost:8080`（開發） |

詳細後端串接待辦清單請參閱 [`TODO.md`](./TODO.md)。

### Nginx 部署 fallback 設定（HTML5 路由必須）

由於路由使用 HTML5 History 模式，部署時需要伺服器返回 `index.html` 供所有非 API 路徑：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

---

## 🔄 資料持久化與重設

本系統資料儲存在瀏覽器的 `localStorage` 中。若您在操作過程中修改了設定（例如新增了課程、變更了配對關係、限制了某個使用者的頁面權限），這些修改會持續保存。

如果您想將資料還原為系統初始狀態，只需要：
1. 開啟瀏覽器開發者工具 (F12)。
2. 切換至 **Application** -> **Local Storage**。
3. 清除該網域下的所有 Key (例如以 `superstart_` 開頭的所有欄位)。
4. 重新整理網頁即可。
