# SSLecture - Shining Star 課程學習與關懷配對管理系統 🌟

SSLecture 是一個基於 **Vue 3 + TypeScript + Vite** 技術棧開發的現代化課程學習與輔導配對管理系統原型。目前前端採用 **Pinia** 全狀態管理配合 **LocalStorage** 持久化，後端將串接 **Spring Boot** 實現完整 OAuth2 JWT 架構。

---

## 📖 專案背景與特色

本系統旨在協助教會或教育機構管理學員的聖經課程學習進度，並搭建「學員 - 輔導教師 - 分區牧者 - 關懷家長」的多元關懷網路，結合了以下特色：
*   **多角色權限控制**：五種角色（管理員、牧者、教師、學員、家長）各司其職，擁有專屬的控制面板。
*   **精美現代視覺**：採用高質感漸層色調、玻璃擬態（Glassmorphism）與滑鼠懸停微動畫，提供流暢的使用者體驗。
*   **發光計畫檢核表**：學員專屬的信仰與生活挑戰追蹤系統。
*   **教師 & 牧者配對管理**：分區牧者可輕鬆完成輔導教師對學員、以及關懷家長的配對設定。

---

## 🛠️ 技術棧說明

*   **前端核心**：Vue 3 (Composition API, `<script setup>`)
*   **建置工具**：Vite 6
*   **狀態管理**：Pinia 3 (模組化設計：`auth` 權限模組、`courses` 課程與進度模組)
*   **路由管理**：Vue Router（v5.x）(HTML5 History 模式，內建導航守衛，防止未授權與被限制之頁面存取)
*   **樣式設計**：Vanilla CSS (響應式排版，完美適配行動端與桌面端)
*   **程式語言**：TypeScript 5

---

## 📂 專案目錄結構

```text
SSLecture/
├── public/                 # 靜態資源
├── docs/                   # 開發文件
│   ├── backend_api_spec.md       # 後端 API 規格（v1.5.0）
│   ├── database_schema.md        # 資料庫設計文件（PostgreSQL DDL + ERD）
│   └── oauth2_social_login_spec.md  # OAuth2 Google/LINE 登入架構設計
├── src/
│   ├── assets/             # 圖片、樣式等靜態資源
│   │   └── styles/main.css # 全域 CSS（漸層、玻璃擬態、通用工具類）
│   ├── components/         # 可複用元件
│   │   ├── student/        # 學員專屬元件
│   │   └── teacher/        # 教師專屬元件
│   ├── composables/        # 可複用邏輯（Composition API）
│   │   ├── useToast.ts     # 全域 Toast / Confirm 通知系統
│   │   └── usePasswordStrength.ts  # 密碼強度計算
│   ├── router/
│   │   └── index.ts        # 路由配置與導航守衛（lazy loading、角色守衛）
│   ├── stores/             # Pinia 狀態管理
│   │   ├── auth.ts         # 使用者驗證與帳號（含 OAuth2 actions）
│   │   ├── courses.ts      # 課程、學習進度與配對關係
│   │   └── bookings.ts     # 課程預約與出席紀錄
│   ├── types/              # TypeScript 型別集中管理
│   │   ├── auth.ts         # User、UserRole、InviteCode 等
│   │   ├── courses.ts      # Course、CourseSession 等
│   │   ├── bookings.ts     # Booking、AttendanceRecord 等
│   │   └── index.ts        # 統一 barrel export
│   ├── utils/
│   │   ├── storage.ts      # localStorage 安全包裝工具
│   │   └── api.ts          # 集中式 API fetch wrapper（含 JWT 注入、401 refresh）
│   ├── views/              # 各角色的控制面板主頁面
│   │   ├── AdminDashboard.vue      # 系統管理員後台
│   │   ├── LoginView.vue           # 登入與註冊介面（含 Google/LINE 登入按鈕）
│   │   ├── LoginCallback.vue       # OAuth2 回調頁（換取 JWT、錯誤處理）
│   │   ├── NotFoundView.vue        # 404 找不到頁面
│   │   ├── OnboardingView.vue      # 首次社群登入補充資料頁
│   │   ├── StudentDashboard.vue    # 學員個人學習面板 & 發光計畫
│   │   ├── TeacherDashboard.vue    # 輔導教師 / 分區牧者 / 家長共用控制面板
│   │   └── UnauthorizedView.vue    # 未授權提示頁
│   ├── App.vue             # 根元件（導航、Toast Provider、密碼修改 Modal）
│   ├── main.ts             # 專案入口（全域錯誤捕獲）
│   └── vite-env.d.ts       # Vite 環境變數型別宣告
├── .env.example            # 環境變數範本（複製為 .env.development 使用）
├── .env.development        # 開發環境變數（VITE_API_BASE_URL 等）
├── .env.production         # 生產環境變數
├── TODO.md                 # 後端串接待辦清單
├── index.html              # HTML 模板入口
├── package.json            # 依賴套件與指令腳本
├── tsconfig.json           # TypeScript 配置
├── vitest.config.ts        # Vitest 測試配置（含 coverage）
└── vite.config.ts          # Vite 建置配置（含 vendor chunk splitting）
```

---

## 🔑 登入方式

### 1. 帳號密碼登入

在登入頁輸入帳號與密碼。可使用以下預設測試帳號（**密碼皮為 `123456`**）：

| 角色 | 預設帳號 | 核心功能 |
| :--- | :--- | :--- |
| **系統管理員** | `admin` | 檢視各教會數據總覽、管理使用者註冊權限、限制特定用戶的頁面存取、編輯課程與講師清單。 |
| **分區牧者** | `pastor` | 專屬「教會配對管理板」，分配輔導教師與學員的關懷對象，管理關懷家長配對。 |
| **輔導教師** | `teacher` | 檢視被指派學員的課程清單與學習進度。 |
| **學員** | `student` | 瀏覽聖經課程、撰寫興心筆記、填寫「發光計畫」。 |
| **關懷家長** | `parent` | 查看與其綁定之子女（學員）的論課記錄與學習百分比。 |

### 2. 邀請碼註冊機制

公開註冊頁預設僅能註冊為 **學員** 角色。若需註冊為教師、牧者、家長或管理員，必須由現有管理員登入「Admin 控制面板」產生對應角色的 **邀請碼**。被邀請者在註冊時輸入邀請碼，系統將自動鎖定其角色與教會。

### 3. 社群平台登入（Google / LINE）

> ⚠️ 目前為前端 Mock 實作，後端就緒後將實現實際 OAuth2 流程。

登入頁體展示 Google / LINE 登入按鈕，點擊後將執行以下流程：

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

若要於本機環境執行此專案，請確保電腦已安裝 **Node.js v22 LTS** 以上版本（本專案開發環境為 Node.js v22.19.0）與 npm 包管理器。

### 1. 安裝專案依賴

開啟終端機並切換至專案根目錄，執行以下指令安裝所需套件：

```bash
npm install
```

### 2. 本地開發伺服器啟動

執行以下指令啟動 Vite 開發伺服器，預設會在本機的 `http://localhost:5173` 啟動：

```bash
npm run dev
```

### 3. 專案編譯與建置

若要將專案打包編譯為生產環境靜態檔案（會輸出至 `dist/` 目錄），請執行：

```bash
npm run build
```

### 4. 預覽生產環境建置結果

在建置完成後，可以使用以下指令本地預覽打包後的成果：

```bash
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
