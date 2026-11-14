# SSLecture - Shining Star 課程學習與關懷配對管理系統 🌟

SSLecture 是一個基於 **Vue 3 + TypeScript + Vite** 技術棧開發的現代化課程學習與輔導配對管理系統原型。目前前端採用 **Pinia** 全狀態管理配合 **LocalStorage** 持久化，後端將串接 **Spring Boot** 實現完整 OAuth2 JWT 架構。

- **線上示範**：<https://jaras0209.github.io/SSLecture_front_end/>（`main` 分支每次更新後自動部署；資料只存在您的瀏覽器裡，可用下方〈登入方式〉的測試帳號登入）
- **後端開發文件**：見 [`docs/README.md`](./docs/README.md)（API 規格、資料庫設計、社群登入）與上線前待辦 [`TODO.md`](./TODO.md)

**目錄**：[專案背景與特色](#-專案背景與特色)・[技術棧](#️-技術棧說明)・[文件](#-文件)・[目錄結構](#-專案目錄結構)・[登入方式](#-登入方式)・
[快速上手](#-快速上手與環境設定)・[後端部署需求](#️-後端部署需求)・[資料持久化、備份與重設](#-資料持久化備份與重設)

---

## 📖 專案背景與特色

本系統旨在協助教會或教育機構管理學員的聖經課程學習進度，並搭建「學員 - 輔導教師 - 分區牧者 - 關懷家長」的多元關懷網路，結合了以下特色：
*   **多角色權限控制**：五種角色（管理員、牧者、教師、學員、家長）各司其職，擁有專屬的控制面板。
*   **雙語系即時切換（i18n）**：完整支援繁體中文（`zh-TW`）與英文（`en`），包含介面、驗證訊息與列印報表模板，並自動記憶語系偏好。
*   **精美現代視覺與無障礙體驗**：採用漸層色調、玻璃擬態（Glassmorphism）、ARIA 無障礙標籤與響應式排版；每頁有自己的瀏覽器標題，並遵循系統的「減少動態效果」設定。
*   **閃耀計畫檢核與列印匯出**：學員專屬的信仰與生活挑戰追蹤系統，支援專屬列印排版與 PDF 匯出。
*   **課程預約、配對與年度申報**：支援一對一／團體預約、出席與心得回饋追蹤、牧者關懷配對管理，以及教師年度教學人次統計申報。
*   **男女分開管理**：以教會為單位，教師只看得到同性別的學員，牧者以上看得到整體狀況；性別由牧者設定。規則集中在 `src/utils/scope.ts`，說明見 [`docs/backend_api_spec.md`](./docs/backend_api_spec.md#可見範圍規則誰看得到誰)〈可見範圍規則〉與 [`docs/database_schema.md`](./docs/database_schema.md#510-性別分開管理與可見範圍) 5.10–5.13。
*   **預約與我的授課**：預約由學員的輔導教師安排；牧者在分區教會總覽看得到全教會的預約，管理員看得到所有教會的預約。連結到教師或牧者帳號的講師在「我的授課」看得到自己授課的全部學員並記錄出席，課程結束後尚未記錄的會在分頁上提醒。
*   **帳號清理**：管理員刪除帳號或變更角色時，自動解除仍指向該帳號的關懷指派、家長綁定與講師連結，並取消其尚未進行的預約（保留歷史紀錄）；已刪除帳號的名稱不能再被註冊，以免新使用者看到前一位的資料。
*   **心得回覆**：教師、牧者與管理員可以回覆學員的聽課心得，學員在課程卡片上看到新回覆提醒。
*   **共用裝置的登入期限**：未勾「記住我」時，閒置 2 小時或關閉瀏覽器後自動登出，到期前 5 分鐘提醒；勾選後在這台裝置上保持登入 30 天（見下方〈登入期限〉）。
*   **資料備份與還原**：後端完成前資料只存在瀏覽器裡，管理員可匯出全部資料為檔案、從檔案還原，超過 7 天未備份會提醒；瀏覽器拒絕儲存時畫面會立即警告（見下方〈資料持久化、備份與重設〉）。
*   **安全性設計**：網站設有內容安全政策（CSP），只執行自身的程式；頭像只接受 `https://` 網址且載入時不帶來源頁面；邀請碼 8 碼隨機字元；密碼規則與嘗試次數限制已寫入 API 規格供後端實作。

---

## 🛠️ 技術棧說明

*   **前端核心**：Vue 3.5 (Composition API, `<script setup>`, `defineAsyncComponent` 按需載入)
*   **建置工具**：Vite 8（Rolldown 打包；`vue-vendor`、`i18n`、`vendor` 以 `codeSplitting` 群組拆成獨立 chunk）
*   **狀態管理**：Pinia 4（模組化設計：`auth` 權限模組、`courses` 課程與進度模組、`bookings` 預約與出席模組）
*   **多語系架構**：Vue I18n 11（Composition API 模式，`zh-TW` / `en` 雙語系；`en` 語系檔按需載入）
*   **路由管理**：Vue Router 5（HTML5 History 模式，內建角色與頁面限制導航守衛；按上一頁時回到原本的捲動位置）
*   **字型**：Quicksand 由 `@fontsource` 隨專案打包，不向 Google Fonts 發出請求
*   **測試**：Vitest 5 + Happy DOM + Vue Test Utils（70 個測試檔案、632 項測試，含四個主要頁面、composable 與表單元件測試，以及以本機 HTTP 伺服器驗證 `api.ts` 的整合測試）；Playwright 端對端測試（59 項，含以 axe 檢查 WCAG 2.1 AA 無障礙與鍵盤操作，以及內容安全政策）
*   **程式碼品質**：TypeScript 6.0（Strict 嚴格模式，以 vue-tsc 3 檢查）、ESLint 10、Prettier 3
*   **樣式設計**：Vanilla CSS（響應式排版，適配行動端、桌面端與 `@media print` 列印模式）
*   **CI／部署**：GitHub Actions（`.github/workflows/`）。分支推送時跑 CI；`main` 更新時再跑一次全部檢查並部署到 GitHub Pages。
    檢查項目：套件漏洞、ESLint、Prettier、單元測試與最低覆蓋率、型別檢查與建置、端對端測試

---

## 📚 文件

| 文件 | 內容 |
| :--- | :--- |
| [`docs/README.md`](./docs/README.md) | **文件導覽**：各文件給誰看、建議閱讀順序、依主題查找、文件維護方式 |
| [`docs/backend_api_spec.md`](./docs/backend_api_spec.md) | 後端 API 規格：所有端點、可見範圍規則、嘗試次數限制、登入期限、CORS、錯誤碼、前端串接步驟 |
| [`docs/database_schema.md`](./docs/database_schema.md) | 資料庫設計：22 張表、設計決策、PostgreSQL 建表 SQL、ERD、從前端備份搬移資料 |
| [`docs/oauth2_social_login_spec.md`](./docs/oauth2_social_login_spec.md) | Google / LINE 社群登入的流程、後端設定與前端整合 |
| [`TODO.md`](./TODO.md) | 後端上線前的待辦清單 |

文件中的連結、章節錨點與檔案路徑由 `npm test` 檢查（`src/__tests__/docs.spec.ts`），改標題或搬檔案時會提醒您一併更新。

---

## 📂 專案目錄結構

```text
SSLecture/
├── .github/
│   ├── workflows/          # ci.yml（分支推送時檢查）、deploy.yml（main：檢查後部署到 GitHub Pages）
│   ├── actions/            # setup-playwright：安裝並快取 E2E 用的 Chromium
│   └── dependabot.yml      # 每週檢查套件與 Actions 更新
├── docs/                   # 後端開發文件（見上方〈文件〉）
├── e2e/                    # Playwright 端對端測試（*.e2e.ts，對正式 build 執行；fixtures.ts 為共用的測試帳號與工具）
├── public/                 # 靜態資源
├── src/
│   ├── assets/             # 圖示與全域樣式（styles/main.css：CSS 變數、玻璃擬態、工具類、列印、減少動態效果）
│   ├── components/         # 可複用元件
│   │   ├── admin/          # 管理員：新增使用者、使用者列表、教會概況、年度教學統計、邀請碼、資料備份
│   │   ├── auth/           # 登入頁：登入／註冊表單、社群登入按鈕、選擇孩子、忘記密碼
│   │   ├── shared/         # 共用：Toast、語言切換、個人資料、修改密碼、密碼強度、性別、教會預約總覽、學員預約摘要
│   │   ├── student/        # 學員：課程卡片與詳情、預約清單、心得、閃耀計畫與列印版
│   │   └── teacher/        # 教師／牧者／家長：學員清單與進度、筆記、預約、我的授課、牧者總覽、年度申報、講師與主題設定
│   ├── composables/        # 可複用邏輯（useSessionTimeout 自動登出、usePageTitle 頁面標題、useStudentList、useToast…）
│   ├── directives/         # v-dialog：對話框的焦點管理與 Esc 關閉
│   ├── i18n/               # Vue I18n 設定與語系檔（locales/zh-TW.json、en.json）
│   ├── mocks/              # 開發期預設資料（30 堂課程），後端就緒後替換
│   ├── router/             # 路由、導航守衛、捲動位置（index.ts）與各角色首頁（homeRoute.ts）
│   ├── stores/             # Pinia：auth（帳號、邀請碼、登入）、courses（課程、進度、閃耀計畫、講師、配對）、bookings（預約、出席）
│   ├── types/              # TypeScript 型別
│   ├── utils/              # 工具：api（呼叫後端）、scope（誰看得到誰）、session（登入期限）、backup（備份還原）、
│   │                       #       persist／storage（localStorage）、csp、account、datetime、avatar、motion…
│   ├── views/              # 各頁面：登入、社群登入回調、首次登入補資料、改密碼、學員／教師／管理員主頁、404、無權限
│   ├── App.vue             # 根元件（導覽列、語言切換、Toast、個人資料與密碼 Modal、自動登出提醒）
│   └── main.ts             # 入口（Pinia、Router、i18n、登入狀態檢查）
│   # 各資料夾的 __tests__/ 為該處的單元測試（Vitest）
├── .env.example            # 環境變數範本（另有 .env.development、.env.production）
├── index.html
├── package.json            # 套件與指令（npm run dev / test / test:coverage / test:e2e / lint / build）
├── playwright.config.ts    # Playwright 設定（自動 build 並以 vite preview 啟動）
├── vite.config.ts          # Vite 建置設定（chunk 拆分、建置時寫入 CSP）
├── vitest.config.ts        # Vitest 設定（含最低覆蓋率）
├── eslint.config.js、.prettierrc.json、tsconfig*.json
└── TODO.md                 # 後端上線前待辦清單
```

---

## 🔑 登入方式

### 1. 帳號密碼登入

在登入頁輸入帳號（或已填寫的電子信箱）與密碼，大小寫與前後空白不影響。帳號為 3–30 個字元的英文字母、數字與 `. _ -`；信箱選填、不可與他人重複。管理員建立帳號或重設密碼後，使用者下次登入會先被要求設定自己的新密碼。可使用以下預設測試帳號（**密碼皆為 `123456`**）：

| 角色 | 預設帳號 | 核心功能 |
| :--- | :--- | :--- |
| **系統管理員** | `admin` | 檢視各教會數據、所有教會的預約與年度申報總覽、管理使用者角色與註冊權限、限制特定用戶的頁面存取、產生與撤銷邀請碼、匯出與還原全部資料。 |
| **分區牧者** | `pastor` | 專屬「教會配對管理板」，分配輔導教師與學員的關懷對象，管理關懷家長配對與講師名冊；看全教會的預約、回覆學員心得；連結講師資料後有「我的授課」。 |
| **輔導教師** | `teacher` | 檢視被指派學員的課程進度並回覆心得、審核閃耀計畫並匯出列印、管理聽課預約與出席、填寫年度教學人次申報；連結講師資料後有「我的授課」。 |
| **學員** | `student` | 瀏覽聖經與專題課程、登記聽課紀錄與個人心得筆記（並看到師長的回覆）、管理預約、填寫「閃耀計畫」。 |
| **關懷家長** | `parent` | 查看與其綁定之子女（學員）的聽課紀錄、學習進度、閃耀計畫與預約。 |

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

完成 onboarding 後，使用者會像一般帳號一樣出現在名冊與管理員帳號列表（標示「以 Google／LINE 登入」），牧者可以設定性別、指派教師與綁定家長。這類帳號沒有密碼，不能用帳號密碼登入。

詳細流程請參閱 [`docs/oauth2_social_login_spec.md`](./docs/oauth2_social_login_spec.md)。

### 4. 登入期限

教會常用共用的電腦或平板，因此登入有期限（`src/utils/session.ts`）：

| | 未勾「記住我」（預設；社群登入一律如此） | 勾選「記住我」 |
| :--- | :--- | :--- |
| 閒置多久自動登出 | 2 小時（到期前 5 分鐘提醒，可按「繼續使用」） | 30 天 |
| 關閉瀏覽器後 | 需重新登入 | 仍保持登入 |

重新整理或另開分頁不受影響；任一分頁有操作，所有分頁都算使用中。後端的對應規則見 API 規格〈記住我與閒置登出〉。

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

本專案使用 Vitest 進行測試（涵蓋各 store、`router` 導航守衛、頁面與元件、composable、工具函式、語系檔與文件連結，共 632 項測試）。

```bash
# 單次執行所有測試
npm run test

# 監聽模式執行測試
npm run test:watch

# 產生測試覆蓋率報告，並檢查最低覆蓋率（CI 與部署流程執行的就是這個）
npm run test:coverage

# 端對端測試（Playwright：自動 build、啟動 vite preview 後以 Chromium 執行）
# 第一次使用前先安裝瀏覽器：npx playwright install chromium
npm run test:e2e
```

**最低覆蓋率**：`vitest.config.ts` 的 `thresholds` 設定了語句 93%、分支 86%、函式 87%、行數 93.5%，
低於任一項 CI 就會失敗。新增功能時請一併寫測試；覆蓋率上升後可以把門檻調高，但不要調低。
報告會產生在 `coverage/`（瀏覽器開啟 `coverage/index.html` 可看到哪些行沒被測到）。

E2E 測試涵蓋各角色登入與路由權限、登入／註冊表單、邀請碼註冊、語系切換、學員聽課紀錄與閃耀計畫、教師新增講師、管理員建立帳號與邀請碼，以及頭像與圖示皆在本機產生（不連外部圖片網站）；另有多分頁同步（資料、語系、登入／登出在分頁間同步）、自動登出、資料備份與還原、無障礙（axe、鍵盤操作、頁面標題、減少動態效果）與內容安全政策的測試。CI 與部署流程都會執行，失敗時會上傳 Playwright trace 供除錯。

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
| `VITE_API_BASE_URL` | 後端 Spring Boot API 網址；**改變後須重新建置**，因為網站的 CSP 只允許連線到這個網址 | `http://localhost:8080`（開發） |
| `VITE_DEMO_MODE` | 登入頁是否顯示快速測試帳號；**接上真正的後端後須設為 `false`** | `true`（目前的示範站） |

詳細後端串接待辦清單請參閱 [`TODO.md`](./TODO.md)。

### Nginx 部署 fallback 設定（HTML5 路由必須）

由於路由使用 HTML5 History 模式，部署時需要伺服器返回 `index.html` 供所有非 API 路徑：

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### 安全性標頭與跨網域

- 建置時已把內容安全政策（CSP）以 `<meta>` 寫入 `index.html`（`src/utils/csp.ts`）。改由自己的伺服器提供網站時，
  建議改以回應標頭提供，並加上 `<meta>` 無法設定的 `frame-ancestors 'none'`（禁止網站被其他網站嵌入）：

  ```nginx
  add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.example.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
  ```

  `connect-src` 請換成實際的 API 網址（與 `VITE_API_BASE_URL` 相同）。
- 前端與 API 在不同網域，後端須設定 CORS，允許前端網域與 `Authorization`、`Content-Type` 標頭，
  並讓前端讀得到 `Retry-After`（詳見 API 規格〈跨網域（CORS）〉）。

---

## 🔄 資料持久化、備份與重設

後端完成前，本系統資料儲存在瀏覽器的 `localStorage` 中：修改會持續保存，但**只存在這台電腦的這個瀏覽器裡**。
清除瀏覽器資料、換電腦或換瀏覽器，資料就會全部消失且無法救回。

- **備份與還原**：管理員頁面最下方的「資料備份」可匯出全部資料為 JSON 檔（`src/utils/backup.ts`），需要時從檔案還原
  （會取代目前所有資料，並請所有人重新登入）。超過 7 天未備份時，管理員頁面會提醒。備份檔含所有帳號的密碼與學員心得，請妥善保管。
  後端上線時也可用這個檔案搬移既有資料（見 [`docs/database_schema.md`](./docs/database_schema.md) 第 9 節）。
- **儲存失敗**：瀏覽器拒絕儲存（例如空間已滿、無痕模式）時，畫面上方會出現警告，此時的變更在重新整理後會遺失。

如果您想將資料還原為系統初始狀態（**會刪除所有資料，建議先匯出備份**），只需要：
1. 開啟瀏覽器開發者工具 (F12)。
2. 切換至 **Application** -> **Local Storage**。
3. 清除該網域下的所有 Key (例如以 `superstart_` 開頭的所有欄位)。
4. 重新整理網頁即可。
