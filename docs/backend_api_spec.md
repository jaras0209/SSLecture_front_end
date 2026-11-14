# SSLecture 後端 API 規格文件

> **文件版本**：v1.8.1
> **最後更新**：2026-11-14
> **前端版本**：Vue 3 + TypeScript（目前以 localStorage 模擬，待串接）
> **目標後端技術**：Spring Boot 3.x + Spring Security 6.x（OAuth2 Client + JWT）
> **相關文件**：[文件導覽](./README.md)・[資料庫設計](./database_schema.md)・[社群登入](./oauth2_social_login_spec.md)・各版本異動見文末[版本紀錄](#版本紀錄)

---

## 目錄

1. [通用規範](#1-通用規範)（含[可見範圍規則](#可見範圍規則誰看得到誰)）
2. [認證 Auth](#2-認證-auth)（含 OAuth2 社群登入）
3. [課程 Courses](#3-課程-courses)
4. [聽課紀錄 Listen Sessions](#4-聽課紀錄-listen-sessions)
5. [講師管理 Lecturers](#5-講師管理-lecturers)
6. [學員關懷配對 Assignments](#6-學員關懷配對-assignments)（含家長綁定、性別）
7. [閃耀計畫 Shining Project](#7-閃耀計畫-shining-project)
8. [管理員 Admin](#8-管理員-admin)
9. [年度教學統計 Teaching Stats](#9-年度教學統計-teaching-stats)
10. [聽課預約 Booking System](#10-聽課預約-booking-system)
11. [資料模型定義](#11-資料模型定義)
12. [錯誤碼一覽](#12-錯誤碼一覽)
13. [前端串接遷移指南](#13-前端串接遷移指南)

附錄：[版本紀錄](#版本紀錄)

> **OAuth2 社群登入詳細設計**：請參閱 [`docs/oauth2_social_login_spec.md`](./oauth2_social_login_spec.md)，
> 內含 Google / LINE 完整流程、Spring Boot SecurityConfig、前端 LoginCallback、onboarding 流程等。

---


## 1. 通用規範

### Base URL
```
https://api.sslecture.example.com/v1
```

### 請求格式
- Content-Type: `application/json`
- 字元編碼：`UTF-8`

### 認證方式
所有需要登入的 API 須在 Header 帶上 JWT Token：
```
Authorization: Bearer <access_token>
```

### 可見範圍規則（誰看得到誰）

前端規則集中在 `src/utils/scope.ts`；目前只在瀏覽器端過濾，**後端必須在每個回傳或修改學員資料的
API 套用同樣的規則**，否則前端的限制可以被繞過。以下各節的「只能查詢其管理的學員」都指這張表：

| 檢視者 | 看得到的學員 |
|--------|--------------|
| `teacher` | 同教會、**同性別**的學員；教師或學員任一方尚未設定 `gender` 時看不到 |
| `pastor` | 同教會的所有學員（不分性別） |
| `admin` / SS 中央（無所屬教會） | 所有學員 |
| `parent` | 綁定的孩子（見[家長綁定](#家長綁定-parent-bindings)） |
| `student` | 只有自己 |

**講師例外**：講師資料（`Lecturer`）若連結到教師或牧者帳號（`linkedUsername`），該帳號在**自己授課的預約**
（`session.lecturerId` 屬於自己）中看得到全部學員，不分性別，並可記錄出席；學員名冊等其他 API 仍依上表。
對應前端 `canViewAttendee()`。

**同一預約中看不到的學員**：教師管理的預約若含有其看不到的學員（例如資料是在規則實施前建立的），
回應中不列出這些學員，只回傳人數 `hiddenAttendeeCount`。

### 時間格式

- **使用者選的時間**（聽課時間 `listenedAt`、預約時間 `proposedAt` / `confirmedAt`）：`YYYY-MM-DDTHH:mm`，**不帶時區**，
  代表台灣時間（`Asia/Taipei`）。後端以台灣時間解讀後儲存，回傳同樣格式
- **系統時間戳記**（`createdAt`、`updatedAt`、`lastLoginAt` 等）：ISO 8601，UTC（例如 `2026-10-28T06:30:00.000Z`）
- 詳見 `docs/database_schema.md` 5.14

### 識別碼

各資源的 `id` 由後端產生（UUID），前端一律當不透明字串，不解析內容。前端 mock 期間的 `sess_...`、`l_...` 等格式只是暫時的。
預約學員沒有自己的 `id`，以「場次 + 學員帳號」定位。

### 標準回應格式

#### 成功
```json
{
  "success": true,
  "data": { ... }
}
```

#### 失敗
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "請先登入"
  }
}
```

### 嘗試次數限制

可以拿來「猜」的 API 都要限制嘗試次數，否則接上網路後就能用程式把密碼或邀請碼一個個試過去：
邀請碼就是註冊成該角色（含管理員）的唯一憑證，密碼最短只要 6 個字元。

| API | 建議限制（同時以「帳號」與「來源 IP」各算一份） |
|-----|-----------------------------------------------|
| `POST /auth/login` | 同一帳號 15 分鐘內失敗 5 次 → 鎖 15 分鐘；同一 IP 15 分鐘內失敗 20 次 → 鎖 15 分鐘 |
| `POST /auth/register`、`PUT /auth/complete-profile`（帶邀請碼） | 同一 IP 每小時邀請碼錯誤 10 次 → 鎖 1 小時 |
| `POST /auth/password/forgot` | 同一帳號每小時 3 封、同一 IP 每小時 10 次（避免被拿來大量寄信） |
| `POST /auth/password/reset`、`POST /auth/exchange` | 同一 IP 每 15 分鐘 20 次 |
| 修改密碼（`POST /auth/reset-password` 改自己的密碼） | 同一帳號 15 分鐘內目前密碼錯誤 5 次 → 鎖 15 分鐘 |

- 超過時回 `429 TOO_MANY_REQUESTS`，並在 `Retry-After` 標頭給還要等幾秒；前端據此顯示「請 N 分鐘後再試」
  （`src/utils/api.ts`）。被鎖期間即使這次是對的也照樣回 429，否則鎖住沒有意義。
- 只計算**失敗**的嘗試，成功後清除該帳號的計數。
- 不讓回應洩漏帳號是否存在：登入時帳號不存在與密碼錯誤都回 `401 INVALID_CREDENTIALS`（前端模擬登入也一樣），
  忘記密碼不論帳號是否存在都回相同的成功訊息；被鎖的帳號與不存在的帳號同樣回 429。
- 記錄被鎖的事件，讓管理員看得到有人在試。

### 跨網域（CORS）

前端部署在 GitHub Pages（`https://jaras0209.github.io/SSLecture_front_end/`），API 在另一個網域，
瀏覽器會先送預檢請求（`OPTIONS`），後端須允許：

| 項目 | 設定 |
|------|------|
| `Access-Control-Allow-Origin` | 前端的來源（正式：`https://jaras0209.github.io`；開發：`http://localhost:5173`）；**不可用 `*`** |
| `Access-Control-Allow-Methods` | `GET, POST, PUT, PATCH, DELETE, OPTIONS` |
| `Access-Control-Allow-Headers` | `Authorization, Content-Type` |
| `Access-Control-Expose-Headers` | `Retry-After`（前端用來顯示「請 N 分鐘後再試」） |
| `Access-Control-Max-Age` | 例如 `600`，減少預檢次數 |

- Token 以 `Authorization` 標頭傳送，不用 Cookie，所以不需要 `Access-Control-Allow-Credentials`
- 社群登入完成後，後端導回前端的 `/SSLecture_front_end/login/callback?code=...`（見 OAuth 文件）
- 前端的內容安全政策（CSP）只允許連線到 `VITE_API_BASE_URL` 的來源（`src/utils/csp.ts`）：
  API 網址改變時須更新該環境變數並重新建置前端，否則請求會被瀏覽器擋下
- 之後若改由自己的伺服器提供前端，請另加 `Content-Security-Policy` 回應標頭並包含 `frame-ancestors 'none'`
  （`<meta>` 版本的 CSP 無法設定此項）

### 分頁格式（列表類 API）
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "total": 100,
    "page": 1,
    "pageSize": 20
  }
}
```

---

## 2. 認證 Auth

### `POST /auth/login`
**說明**：帳號密碼登入，回傳 JWT Token

**權限**：公開

**Request Body**：
```json
{
  "identifier": "student01",
  "password": "123456",
  "rememberMe": false // 選填，預設 false；見「記住我與閒置登出」
}
```

**Response**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 3600,
    "user": {
      "id": "u_001",
      "username": "student01",
      "role": "student",
      "church": "愛與話語",
      "email": "student01@example.com",
      "avatarUrl": "https://...",
      "mustChangePassword": false
    }
  }
}
```

- `identifier`：帳號或信箱，去掉前後空白、不分大小寫比對（前端 `authStore.findUsername()`）
- `mustChangePassword = true` 時，這組 token 只能呼叫 `POST /auth/reset-password`（改自己的密碼）與
  `POST /auth/logout`，其他 API 回傳 `403 PASSWORD_CHANGE_REQUIRED`；前端會導向「請先設定新密碼」頁

**錯誤**：
- `401 INVALID_CREDENTIALS`：帳號或密碼錯誤（帳號不存在也回這個，不透露帳號是否存在）
- `429 TOO_MANY_REQUESTS`：失敗太多次，暫時鎖住（見[嘗試次數限制](#嘗試次數限制)）
- `401 USE_SOCIAL_LOGIN`：此帳號沒有密碼，只能用 Google / LINE 登入
- `403 ACCOUNT_DISABLED`：帳號被停用

---

### `POST /auth/register`
**說明**：註冊新帳號。若有提供邀請碼（`inviteCode`），系統將驗證該邀請碼，並依邀請碼綁定的角色及教會配發權限。若未提供邀請碼，則強制註冊為一般學員（`student`），且必須指定所屬教會。

**權限**：公開

**Request Body**：
```json
{
  "username": "new_user",
  "email": "new_user@example.com", // 可選
  "password": "123456",
  "church": "愛與話語",          // 若無邀請碼或邀請碼未指定教會時必填
  "inviteCode": "SS-TCH-K7M2QX9D" // 可選
}
```

- `username`：去掉前後空白後轉小寫儲存；3–30 字元，只用英數字與 `. _ -`，不分大小寫不可重複
- `email`：選填；去掉前後空白後轉小寫儲存，不分大小寫不可與其他帳號重複
- `password`：須符合[密碼規則](#密碼規則)

**Response**：
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "u_002",
      "username": "new_user",
      "role": "teacher",
      "church": "愛與話語"
    }
  }
}
```

**錯誤**：
- `400 INVALID_INVITE_CODE`：邀請碼無效、過期或已作廢
- `429 TOO_MANY_REQUESTS`：邀請碼錯誤太多次，暫時鎖住（見[嘗試次數限制](#嘗試次數限制)）
- `400 VALIDATION_ERROR`：帳號或信箱格式不符（訊息指出哪個欄位）
- `400 WEAK_PASSWORD`：密碼不符合[密碼規則](#密碼規則)
- `409 USERNAME_TAKEN`：帳號已被使用（不分大小寫）
- `409 EMAIL_TAKEN`：信箱已被其他帳號使用

#### 密碼規則

使用者自己設定的密碼（註冊、修改密碼）須至少 6 個字元，並符合以下四項中的任兩項：

- 8 個字元以上
- 同時有大寫和小寫英文字母
- 包含數字
- 包含符號（英文字母與數字以外的任何字元）

前端在 `src/composables/usePasswordStrength.ts`（`passwordChecks()`、`isStrongEnough()`）檢查同一套規則，
畫面上的提示與規則清單也由此產生；後端須再檢查一次，不符合時回 `400 WEAK_PASSWORD`。
管理員建立帳號或重設密碼時不受此限，因為使用者下次登入須先換掉（`mustChangePassword`）。

---

### `POST /auth/reset-password`
**說明**：修改密碼。

**權限**：需登入（修改自己的密碼）或 Admin（重設他人密碼）

**Request Body**：
```json
{
  "username": "student01", // 可選，Admin 重設他人密碼時必填
  "oldPassword": "old_password", // 可選，若是修改自己密碼則必填
  "newPassword": "new_password"
}
```

**Response**：
```json
{ "success": true }
```

- Admin 重設他人密碼時，該帳號設為 `mustChangePassword = true`；使用者自己改密碼成功後清除
- 以 Google／LINE 登入、沒有密碼的帳號不可重設（`400 VALIDATION_ERROR`）：給它一組已知的預設密碼，
  等於讓知道這組密碼的人能用帳號密碼登入並占用該帳號（前端 `authStore.adminResetPassword()` 也會拒絕）
- 修改自己的密碼時，`newPassword` 須符合[密碼規則](#密碼規則)（否則 `400 WEAK_PASSWORD`），且不可與目前密碼相同

---

### `POST /auth/refresh`
**說明**：使用 Refresh Token 換發新的 Access Token

**Request Body**：
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "expiresIn": 3600
  }
}
```

---

### `POST /auth/logout`
**說明**：登出（伺服器端將 Refresh Token 列入黑名單）

**權限**：需登入

**Response**：
```json
{ "success": true }
```

---

### `GET /auth/me`
**說明**：取得當前登入使用者的完整資料

**權限**：需登入

**Response**：
```json
{
  "success": true,
  "data": {
    "id": "u_001",
    "username": "student01",
    "role": "student",
    "church": "愛與話語",
    "displayName": "王小明",
    "realName": "王小明",
    "email": "ming@example.com",
    "gender": "male",
    "avatarUrl": "https://...",
    "loginMethod": "credentials",
    "mustChangePassword": false,
    "childUsernames": null,
    "lastLoginAt": "2026-11-10T01:30:00Z",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

- `mustChangePassword` 為 `true` 時前端只顯示「請先設定新密碼」頁（其他 API 也會回 `403 PASSWORD_CHANGE_REQUIRED`）
- `childUsernames` 只用於 `parent`，其他角色為 `null`；`loginMethod` 為 `google` / `line` 時沒有密碼，前端不顯示「修改密碼」

---

### `PATCH /auth/me`
**說明**：修改自己的個人資料（前端個人資料視窗，`authStore.updateProfile()`）

**權限**：需登入

**Request Body**（欄位均選填，只傳要改的）：
```json
{
  "displayName": "小明",
  "realName": "王小明",
  "avatarUrl": "https://api.dicebear.com/7.x/fun-emoji/svg?seed=ming",
  "email": "ming@example.com"
}
```

**規則**（全部檢查通過才寫入，不會只存一部分）：
- `displayName`、`realName`：去掉前後空白；空字串表示清除
- `avatarUrl`：只接受 `https://`、最長 2048 字元；空字串表示改回預設頭像。頭像會在每位看到的人的瀏覽器載入，
  其他網址可被用來追蹤誰在何時看了名冊（前端 `isAllowedAvatarUrl()`）
- `email`：同 `POST /auth/register` 的信箱規則（選填、小寫、不可與其他帳號重複）；空字串表示清除
- 角色、教會、性別、帳號名稱不能在這裡改（由管理員或牧者處理）

**Response**：更新後的使用者，格式同 `GET /auth/me`

**錯誤**：
- `400 VALIDATION_ERROR`：頭像網址不是 `https://` 或太長、信箱格式不符（訊息指出哪個欄位）
- `409 EMAIL_TAKEN`：信箱已被其他帳號使用

---

### OAuth2 社群登入端點（Spring Boot 自動提供）

> 完整設計請見 [`docs/oauth2_social_login_spec.md`](./oauth2_social_login_spec.md)

| 端點 | 說明 | 呼叫方 |
|------|------|--------|
| `GET /oauth2/authorization/google` | 啟動 Google 授權流程（Redirect）| 前端 `window.location.href` |
| `GET /oauth2/authorization/line` | 啟動 LINE 授權流程（Redirect）| 前端 `window.location.href` |
| `GET /login/oauth2/code/google` | Google 授權碼回調（Spring 自動處理）| Google 伺服器 |
| `GET /login/oauth2/code/line` | LINE 授權碼回調（Spring 自動處理）| LINE 伺服器 |

### `POST /auth/exchange`
**說明**：OAuth2 成功後，前端用短效一次性 code（60 秒）換取 JWT

**權限**：公開

**Request Body**：
```json
{ "code": "550e8400-e29b-41d4-a716-446655440000" }
```

**Response**：
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "expiresIn": 3600,
    "needsOnboarding": false,
    "user": {
      "id": "uuid-001",
      "displayName": "王小明",
      "role": "student",
      "churchId": null,
      "avatarUrl": "https://..."
    }
  }
}
```

**錯誤**：
- `400 INVALID_CODE`：code 不存在或已過期
- `400 CODE_ALREADY_USED`：code 已被使用

---

### `PUT /auth/complete-profile`
**說明**：首次社群登入後補充所屬教會、username、邀請碼

**權限**：需 JWT（onboarding 狀態下呼叫）

**Request Body**：
```json
{
  "churchId": "uuid-church-001",
  "username": "wangxiaoming",
  "inviteCode": "SS-PAR-W4HN8RTC",
  "childUsernames": ["student01"]
}
```

- `childUsernames`：只在邀請碼為 `parent` 時使用，綁定的孩子（須為所選教會的學員，其餘忽略）；
  與帳號密碼註冊相同，家長須至少綁定一位孩子（`400 VALIDATION_ERROR`）。前端以 `ChildPicker.vue` 選擇
```
```

**Response**：
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "username": "wangxiaoming", "role": "teacher", "church": "愛與話語" }
  }
}
```

**錯誤**：
- `400 CHURCH_REQUIRED`：教會為必填
- `400 INVALID_INVITE_CODE`：邀請碼無效
- `409 USERNAME_TAKEN`：username 已存在

**說明**：完成後這位使用者就和一般帳號一樣出現在名冊與 `GET /admin/users`（`loginMethod` 為 `google` / `line`、
沒有密碼），牧者可設定性別、指派教師、綁定家長，使用者也能編輯個人資料。前端 mock 以
`authStore.completeProfile()` 寫入 `usersDb` 模擬此行為。

---

### `GET /auth/social-accounts`
**說明**：取得目前使用者已綁定的社群帳號列表

**權限**：需 JWT

**Response**：
```json
{
  "success": true,
  "data": [
    { "provider": "google", "linkedAt": "2026-08-12T10:00:00Z" },
    { "provider": "line",   "linkedAt": "2026-08-12T11:00:00Z" }
  ]
}
```

---

### `DELETE /auth/social-accounts/{provider}`
**說明**：解除社群帳號綁定（至少須保留一種登入方式）

**權限**：需 JWT

**錯誤**：
- `400 CANNOT_UNLINK_ONLY_LOGIN`：此為唯一登入方式，無法解除

---

## 3. 課程 Courses

> 課程清單由後端維護，前端只讀取。

### `GET /courses`
**說明**：取得所有課程清單

**權限**：需登入

**Query Params**：
| 參數 | 型別 | 說明 |
|------|------|------|
| `category` | `bible` \| `lecture` \| 不傳 | 篩選分類 |
| `church` | string | 篩選教會（若有教會專屬課程） |

**Response**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "bible-01",
        "title": "聖經時觀",
        "category": "bible",
        "description": "精選聖經專題...",
        "coverColor": "linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)",
        "duration": 180
      }
    ],
    "total": 30
  }
}
```

---

### `GET /courses/:courseId`
**說明**：取得單一課程詳情（含授課講師清單）

**權限**：需登入

**Response**：
```json
{
  "success": true,
  "data": {
    "id": "bible-01",
    "title": "聖經時觀",
    "category": "bible",
    "description": "...",
    "coverColor": "...",
    "duration": 180,
    "lecturers": [
      { "id": "l1", "name": "張牧師", "title": "pastor" }
    ]
  }
}
```

---

## 4. 聽課紀錄 Listen Sessions

> **核心設計理念**：  
> 學員每次聆聽同一課程，都會**新增一筆** Session 紀錄，不覆蓋舊紀錄。  
> 只要有任何一筆 Session 存在，該課程即標記為「已完成（completed = true）」。  
> Session 建立後，允許學員修改聽課時間、講師與心得。

### `GET /progress/:username`
**說明**：取得某學員所有課程的進度總覽

**權限**：
- `student`：只能查詢自己
- `teacher` / `pastor` / `parent`：只能查詢看得到的學員（見[可見範圍規則](#可見範圍規則誰看得到誰)）
- `admin`：可查詢任何人

**Response**：
```json
{
  "success": true,
  "data": {
    "username": "student01",
    "completedCount": 15,
    "totalCourses": 30,
    "records": [
      {
        "courseId": "bible-01",
        "completed": true,
        "sessionCount": 2,
        "lastUpdated": "2026-06-15T10:00:00Z",
        "latestLecturer": "張牧師 牧師"
      }
    ]
  }
}
```

---

### `GET /progress/:username/:courseId/sessions`
**說明**：取得某學員某課程的所有聽課 Session 紀錄（依時間降冪排列）

**權限**：同進度總覽

**Response**：
```json
{
  "success": true,
  "data": {
    "courseId": "bible-01",
    "completed": true,
    "sessions": [
      {
        "id": "session_1718467200000",
        "lecturer": "張牧師 牧師",
        "listenedAt": "2026-06-15T09:00",
        "notes": "這次收穫很多，了解了聖經時觀的含義。",
        "createdAt": "2026/6/15 10:30:00",
        "updatedAt": null
      }
    ]
  }
}
```

---

### `POST /progress/:username/:courseId/sessions`
**說明**：新增一筆聽課紀錄（初次或複習皆使用此端點）

**權限**：
- `student`：只能對自己操作

**Request Body**：
```json
{
  "lecturer": "張牧師 牧師",
  "listenedAt": "2026-06-15T09:00",
  "notes": "這次收穫很多..."
}
```

**Validation 規則**：
- `lecturer`：必填，長度 1~50 字元
- `listenedAt`：必填，格式 `YYYY-MM-DDTHH:mm`，不可晚於目前時間 + 1 小時
- `notes`：選填，最大 2000 字元

**Response**：
```json
{
  "success": true,
  "data": {
    "id": "session_1718467200000",
    "lecturer": "張牧師 牧師",
    "listenedAt": "2026-06-15T09:00",
    "notes": "這次收穫很多...",
    "createdAt": "2026-06-15T10:30:00Z",
    "courseCompleted": true
  }
}
```

---

### `PATCH /progress/:username/:courseId/sessions/:sessionId`
**說明**：修改一筆既有聽課 Session（聽課時間、講師、心得均可修改）

**權限**：
- `student`：只能修改自己的紀錄
- `teacher` / `admin`：可協助修改

**Request Body**（所有欄位均選填，只傳要修改的欄位）：
```json
{
  "lecturer": "陳傳道 傳道",
  "listenedAt": "2026-06-14T14:00",
  "notes": "修改後的心得..."
}
```

**Response**：
```json
{
  "success": true,
  "data": {
    "id": "session_1718467200000",
    "lecturer": "陳傳道 傳道",
    "listenedAt": "2026-06-14T14:00",
    "notes": "修改後的心得...",
    "createdAt": "2026-06-15T10:30:00Z",
    "updatedAt": "2026-06-15T13:00:00Z"
  }
}
```

**錯誤**：
- `404 SESSION_NOT_FOUND`：找不到此 Session
- `403 FORBIDDEN`：無權限修改他人紀錄

---

### `DELETE /progress/:username/:courseId/sessions/:sessionId`
**說明**：刪除一筆聽課 Session

**權限**：`admin` 限定

> ⚠️ **注意**：若刪除後該課程的 sessions 清單為空，`completed` 欄位自動改回 `false`。

**Response**：
```json
{ "success": true }
```

---

### `GET /progress/:username/:courseId/feedback`
**說明**：取得對學員某課程心得的回覆（依時間由舊到新）

**權限**：學員本人；看得到這位學員的教師、牧者、家長（見[可見範圍規則](#可見範圍規則誰看得到誰)）；`admin`

**Response**：
```json
{
  "success": true,
  "data": [
    { "id": "fb_01", "author": "teacher01", "authorName": "王老師", "message": "寫得很好，繼續加油", "createdAt": "2026-01-02T01:00:00Z" }
  ]
}
```

---

### `POST /progress/:username/:courseId/feedback`
**說明**：回覆學員某課程的心得（只新增、不修改）

**權限**：看得到這位學員的 `teacher`、同教會 `pastor`、`admin`；家長與學員不能回覆（`403 FORBIDDEN`）

**Request Body**：
```json
{ "message": "寫得很好，繼續加油" }
```
- `message`：去掉前後空白後不可為空（`400 VALIDATION_ERROR`）

對應前端 `coursesStore.getFeedback()` / `addFeedback()`；資料表見 `docs/database_schema.md` 2.20。

### `GET /progress/:username/feedback/unread`
**說明**：學員有新回覆的課程與則數（前端在課程卡片與「課程」分頁上顯示提醒）

**權限**：學員本人

```json
{ "success": true, "data": { "bible-01": 2, "lecture-03": 1 } }
```

### `POST /progress/:username/:courseId/feedback/seen`
**說明**：學員打開課程即視為已讀該課程的回覆；記錄的時間為已讀到的最新一則回覆的 `createdAt`

**權限**：學員本人（家長、教師查看不會改變學員的已讀狀態）

對應前端 `coursesStore.unreadFeedback()` / `coursesStore.coursesWithUnreadFeedback()` / `coursesStore.markFeedbackSeen()`。

---

## 5. 講師管理 Lecturers

### `GET /lecturers`
**說明**：取得可用講師清單

**權限**：需登入

**Query Params**：
| 參數 | 型別 | 說明 |
|------|------|------|
| `church` | string | 篩選教會 |
| `courseId` | string | 篩選有授課某課程的講師 |

**Response**：
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "l1",
        "name": "張牧師",
        "title": "pastor",
        "church": "愛與話語",
        "courseIds": ["bible-01", "bible-02"],
        "linkedUsername": "teacher01"
      }
    ]
  }
}
```

---

### `POST /lecturers`
**說明**：新增講師

**權限**：該教會的 `teacher`、`pastor`；`admin` 可管理任何教會（前端「設定」分頁）

**Request Body**：
```json
{
  "name": "林長老",
  "title": "elder",
  "church": "愛與話語",
  "courseIds": ["lecture-01", "lecture-02"],
  "linkedUsername": "teacher02"
}
```

**欄位說明**：
| 欄位 | 型別 | 必填 | 說明 |
|------|------|------|------|
| `name` | string | 是 | 講師顯示名稱 |
| `title` | string | 是 | 稱謂代碼：`lecturer`（講師）、`pastor`（牧師）、`preacher`（傳道人）、`elder`（長老）、`pastor_wife`（師母）、`counselor`（輔導）、`guest`（特約講師）；畫面由前端依語言翻譯 |
| `church` | string | 是 | 所屬教會 |
| `courseIds` | string[] | 是 | 可講授課程 ID 清單 |
| `linkedUsername` | string? | 否 | 連結已登入教師帳號（空則為自訂講師） |

> [!NOTE]
> `linkedUsername` 為空表示「自訂／外來講員」，不連結系統帳號。`PUT` 時未傳此欄位則維持現有的連結。
> 早期資料的 `title` 可能是中文（如「牧師」），讀取或搬移時請依上表換成代碼（前端 `src/utils/lecturerTitle.ts`）；
> 認不得的稱謂原樣保留。

---

### `PUT /lecturers/:lecturerId`
**說明**：完整更新講師資料

**權限**：同 `POST /lecturers`

**Request Body**：同 POST

---

### `DELETE /lecturers/:lecturerId`
**說明**：刪除講師

**權限**：同 `POST /lecturers`

---

## 6. 學員關懷配對 Assignments

> 每位學員可配對兩種關懷角色：
> - `teacher`：輔導教師（須與學員同性別）
> - `pastor`：分區牧者
>
> 家長與孩子的綁定另見[家長綁定](#家長綁定-parent-bindings)；性別設定見[性別](#性別-gender)。

### `GET /assignments/:studentUsername`
**說明**：取得某學員的關懷人員配對資料

**權限**：
- `student`：只能查詢自己
- `teacher` / `pastor` / `parent`：只能查詢看得到的學員（見[可見範圍規則](#可見範圍規則誰看得到誰)）
- `admin`：可查詢任何人

**Response**：
```json
{
  "success": true,
  "data": {
    "studentUsername": "student01",
    "teacher": "teacher01",
    "pastor": "pastor01"
  }
}
```

---

### `PUT /assignments/:studentUsername`
**說明**：設定或更新學員的關懷人員配對

**權限**：
- `teacher`：只能設定 `teacher` 欄位（且只能指定自己）
- `pastor`：只能設定 `pastor` 欄位（且只能指定自己）
- `admin`：可設定任意欄位、指定任意人

**Request Body**（欄位均選填）：
```json
{
  "teacher": "teacher01",
  "pastor": "pastor01"
}
```

**檢查**：`teacher` 只能是看得到這位學員的教師（同教會、同性別、雙方皆已設定性別；前端 `canMentor()`），
否則回傳 `403 STUDENT_NOT_VISIBLE`。家長綁定不在這裡，見[家長綁定](#家長綁定-parent-bindings)。

---

### `DELETE /assignments/:studentUsername/:role`
**說明**：移除某角色的配對

**權限**：同 PUT

**Path Params**：`role` = `teacher` | `pastor`

---

### `GET /assignments/teacher/:teacherUsername/students`
**說明**：取得某輔導教師管理的所有學員列表

**權限**：
- `teacher`：只能查詢自己
- `admin`：可查詢任何人

**Response**：
```json
{
  "success": true,
  "data": {
    "teacherUsername": "teacher01",
    "students": [
      {
        "username": "student01",
        "displayName": "王小明",
        "church": "愛與話語",
        "completedCount": 15,
        "totalCourses": 30
      }
    ]
  }
}
```

---

### 家長綁定 Parent Bindings

> 一位家長可綁定多位孩子，一位孩子可有多位家長。家長只看得到綁定的孩子。
> 對應前端 `authStore.parentsOf()` / `childrenOf()` / `bindChild()` / `unbindChild()`。

#### `GET /parents/:parentUsername/children`
**說明**：取得家長綁定的孩子（依綁定順序）

**權限**：家長本人、同教會的 `pastor`、`admin`

**Response**：
```json
{ "success": true, "data": { "parentUsername": "parent01", "children": ["student01", "student02"] } }
```

#### `GET /students/:studentUsername/parents`
**說明**：取得綁定某學員的家長

**權限**：同教會的 `pastor`、`admin`

#### `PUT /parents/:parentUsername/children/:studentUsername`
**說明**：綁定（已綁定則不變）

**權限**：同教會的 `pastor`、`admin`；家長以邀請碼註冊時也會建立綁定（見 `POST /auth/register`）

**檢查**：`parentUsername` 須為 `parent`、`studentUsername` 須為 `student`，且同教會，否則 `400 VALIDATION_ERROR`

#### `DELETE /parents/:parentUsername/children/:studentUsername`
**說明**：解除綁定

**權限**：同 PUT

---

### 性別 Gender

#### `PUT /users/:username/gender`
**說明**：設定或清除教師、學員的性別。教師只看得到同性別的學員，未設定性別的教師看不到任何學員。

**權限**：同教會的 `pastor`、`admin`（使用者不能自己設定）

**Request Body**：
```json
{ "gender": "female" }
```
- `gender`：`male` | `female` | `null`（`null` = 清除）
- 只接受 `role` 為 `student` 或 `teacher` 的帳號，否則 `400 VALIDATION_ERROR`
- 講師資料本身不分性別

**副作用建議**：改變性別後，原本的輔導教師可能看不到這位學員；回應中附上
`mentorMismatch: true`，讓牧者重新指派（前端以「有 N 位學員的輔導教師看不到他們」提示）。

---

### 帳號與信箱（規劃）

前端已完成：帳號規則、選填信箱、帳號或信箱登入、管理員設定的密碼須更換。以下需要後端寄信，尚未實作：

#### `POST /auth/email/verify-request`
寄出信箱驗證信（含一次性連結，建議 24 小時有效）。**權限**：登入者本人

#### `POST /auth/email/verify`
`{ "token": "..." }`：驗證成功後 `emailVerified = true`。更換信箱時重設為 `false`。

#### `POST /auth/password/forgot`
`{ "identifier": "帳號或信箱" }`：帳號有**已驗證**信箱時寄出重設連結（建議 30 分鐘有效、只能用一次）。
不論帳號是否存在都回傳相同的成功訊息，避免被用來試探帳號。

#### `POST /auth/password/reset`
`{ "token": "...", "newPassword": "..." }`：重設成功後清除 `mustChangePassword`，並撤銷該帳號所有 refresh token。

**社群登入合併規則（安全性）**：只有在本地帳號的信箱**已驗證**、且 Google / LINE 回報的信箱也已驗證時，
才自動把社群帳號綁定到同信箱的本地帳號；否則請使用者先以密碼登入後，再於個人資料手動綁定。
否則有人可先用他人的信箱註冊密碼帳號，等信箱主人以 Google 登入時被自動綁進該帳號（帳號預先劫持）。

---

## 7. 閃耀計畫 Shining Project

### `GET /shining/:username`
**說明**：取得某學員的閃耀計畫完整資料

**權限**：同學員關懷配對的讀取權限

**Response**：
```json
{
  "success": true,
  "data": {
    "username": "student01",
    "name": "王小明",
    "birthday": "2010-05-20",
    "church": "愛與話語",
    "schoolGrade": "師大附中 高一",
    "faithPhase1": {
      "worship": true,
      "prayer": false,
      "independent": true,
      "reply": true,
      "share": false
    },
    "faithPhase2": {
      "courses30": false,
      "prayerLong": false,
      "morningWorship": true,
      "readBible": false,
      "churchService": true
    },
    "advancedChallenges": {
      "wednesday": false,
      "shareFaith": true,
      "copySermon": false,
      "morningProverb": true,
      "custom": false
    },
    "customChallenge": "每天讀一章詩篇",
    "characterLectures": {
      "品格力 - 自律": { "speaker": "張牧師", "date": "2026-03-10" }
    },
    "comingOfAgeTopics": {
      "基督教歷史": { "speaker": "陳傳道", "date": "2026-04-01" }
    },
    "updatedAt": "2026-06-15T10:00:00Z"
  }
}
```

---

### `PATCH /shining/:username`
**說明**：更新閃耀計畫（部分更新，只傳要修改的欄位）

**權限**：
- `student`：只能更新自己的資料
- `teacher`：可協助更新其管理學員的資料
- `admin`：可更新任何人

**Request Body**（所有欄位均選填）：
```json
{
  "name": "王小明",
  "birthday": "2010-05-20",
  "church": "愛與話語",
  "schoolGrade": "師大附中 高一",
  "faithPhase1": { "worship": true },
  "faithPhase2": { "courses30": true },
  "advancedChallenges": { "shareFaith": true },
  "customChallenge": "每天讀一章詩篇",
  "characterLectures": {
    "品格力 - 自律": { "speaker": "張牧師", "date": "2026-03-10" }
  },
  "comingOfAgeTopics": {
    "基督教歷史": { "speaker": "陳傳道", "date": "2026-04-01" }
  }
}
```

> ⚠️ **注意**：學員完成**目前課程目錄中的所有課程**時，`faithPhase2.courses30` 視為已勾選（前端 `isShiningChecked()`、
> `hasCompletedAllCourses()`），不受傳入值影響；此時前端的勾選框也會鎖定。未全部完成前，學員可以自己勾選
> （例如在其他地方聽完的）。

---

### 專題主題 Themes

各教會的「品格力」與「成年禮」專題講座主題（資料庫 `themes`，前端 `addTheme()` / `updateTheme()` / `deleteTheme()`），
閃耀計畫的講座登記表依此列出。

**權限**：讀取需登入；新增、修改、刪除為該教會的 `teacher`、`pastor`，`admin` 可管理任何教會

| 方法 | 端點 | 說明 |
|------|------|------|
| `GET` | `/themes?church=愛與話語&type=character` | 依順序列出；`type` 為 `character` 或 `comingOfAge` |
| `POST` | `/themes` | `{ "church": "愛與話語", "type": "character", "name": "品格力 - 謙卑" }`，加在最後 |
| `PUT` | `/themes/:themeId` | `{ "name": "新名稱" }` 改名 |
| `DELETE` | `/themes/:themeId` | 刪除（軟刪除 `is_active = FALSE`） |

- 同一教會、同一類型的名稱不可重複（`409 THEME_EXISTS`）
- 學員已登記的講座以主題**名稱**存放（`shining_lectures.theme_name`，見資料庫文件 5.3），改名或刪除主題不會改動已登記的內容

---

## 8. 管理員 Admin

### `GET /admin/users`
**說明**：取得所有使用者列表

**權限**：`admin`

**Query Params**：
| 參數 | 型別 | 說明 |
|------|------|------|
| `role` | string | 篩選角色 |
| `church` | string | 篩選教會 |
| `page` | number | 頁碼（預設 1）|
| `pageSize` | number | 每頁筆數（預設 20）|

---

### `POST /admin/users`
**說明**：建立新使用者帳號

**權限**：`admin`

**Request Body**：
```json
{
  "username": "student02",
  "email": "student02@example.com",
  "password": "初始密碼",
  "role": "student",
  "church": "愛與話語",
  "displayName": "李小華"
}
```

- 帳號與信箱規則同 `POST /auth/register`；建立的帳號 `mustChangePassword = true`，
  使用者第一次登入須先換掉管理員設定的密碼（前端 `authStore.createAccount()`）

---

### `PUT /admin/users/:username`
**說明**：更新使用者資料（包含重設密碼、更改角色、性別）

**權限**：`admin`

**Request Body**（欄位均選填）：
```json
{
  "displayName": "新名稱",
  "role": "teacher",
  "church": "愛與話語",
  "gender": "male",
  "password": "新密碼（選填）"
}
```

**更改角色時**：先依「原本的角色」做與刪除帳號相同的清理（見下方），再更新角色；角色不變則不清理。
預約的取消原因為「輔導教師已不再擔任此身分」。

更改角色或重設密碼後，該帳號已登入的工作階段須失效，見[帳號變更時結束既有的登入](#帳號變更時結束既有的登入)。

**設定密碼（`password`）時**：
- 社群帳號（`loginMethod` 為 `google` / `line`、沒有密碼）不可設定：回 `400 VALIDATION_ERROR`。給它一組管理員知道的密碼，
  等於讓知道的人能以帳號密碼登入並占用該帳號（同 `POST /auth/reset-password`）
- 設定後 `mustChangePassword = true`，使用者下次登入須先換掉；不受[密碼規則](#密碼規則)限制，因為馬上就要換
- 前端目前的「重設密碼」一律設為預設密碼（`DEFAULT_RESET_PASSWORD`），並以確認視窗告知管理員

---

### `DELETE /admin/users/:username`
**說明**：停用使用者帳號（軟刪除，`isActive = false`），並在同一個交易中清理仍指向該帳號的資料
（對應前端 `useAccountCleanup().releaseRole()`）

**權限**：`admin`

| 原本的角色 | 清理 |
|------------|------|
| `student` | 解除所有家長綁定；刪除其教師與牧者指派 |
| `teacher` | 從所有學員的輔導教師指派中移除；`pending`、`confirmed` 的預約改為 `cancelled`，`cancelReason` 為「輔導教師帳號已刪除」 |
| `pastor` | 從所有學員的牧者指派中移除 |
| `teacher`、`pastor` | 連結到該帳號的講師資料解除連結（講師保留）；教師與牧者互換角色時保留連結 |
| `parent` | 解除其所有綁定 |

已完成、已取消的預約、教學統計與聽課紀錄保留為歷史。

**帳號名稱不可再被使用**：停用的帳號列仍在，`username` 的唯一限制照常生效，之後以同名註冊或建立帳號都回
`409 USERNAME_TAKEN`。上述歷史資料都掛在這個帳號名稱下，若讓新帳號取得同名，新使用者會看到前一位的心得、
閃耀計畫與回覆。前端以 `authStore.retiredUsernames` 做同樣的事（見 `authStore.deleteAccount()`）。

停用後，該帳號已登入的工作階段須立即失效，見[帳號變更時結束既有的登入](#帳號變更時結束既有的登入)。

**Response**：回傳清理的筆數，前端據此提示管理員
```json
{
  "success": true,
  "data": {
    "username": "teacher01",
    "cleanup": { "mentorAssignments": 3, "lecturerLinks": 1, "cancelledBookings": 2 }
  }
}
```

---

### `GET /admin/church-summary`
**說明**：取得各教會的統計數據

**權限**：`admin` / `pastor`（牧者只能看自己負責的教會）

**Response**：
```json
{
  "success": true,
  "data": [
    {
      "church": "愛與話語",
      "teacherCount": 5,
      "studentCount": 30,
      "completionRate": 0.62
    }
  ]
}
```

---

### `GET /admin/page-restrictions/:username`
**說明**：取得某使用者的頁面存取限制清單

**權限**：`admin`

**Response**：
```json
{
  "success": true,
  "data": {
    "username": "student01",
    "restrictedPages": ["/shining"]
  }
}
```

---

### `POST /admin/page-restrictions/:username/toggle`
**說明**：切換頁面存取限制（有則移除，無則新增）

**權限**：`admin`

**Request Body**：
```json
{ "page": "/shining" }
```

---

### `GET /admin/invite-codes`
**說明**：取得系統中所有的邀請碼清單

**權限**：`admin`

**Response**：
```json
{
  "success": true,
  "data": [
    {
      "code": "SS-TCH-K7M2QX9D",
      "role": "teacher",
      "church": "愛與話語",
      "createdBy": "admin01",
      "createdAt": "2026-07-30T10:00:00Z",
      "expiresAt": "2026-08-06T10:00:00Z",
      "usedBy": null,
      "usedAt": null,
      "revoked": false
    }
  ]
}
```

---

### `POST /admin/invite-codes`
**說明**：產生一組新邀請碼

**權限**：`admin`

**Request Body**：
```json
{
  "role": "teacher",
  "church": "愛與話語", // admin 角色時可為 null
  "expiryDays": 7
}
```

**Response**：
```json
{
  "success": true,
  "data": {
    "code": "SS-TCH-K7M2QX9D",
    "expiresAt": "2026-08-06T10:00:00Z"
  }
}
```

**邀請碼格式**：`SS-{角色前綴}-{8 個隨機字元}`，前綴為 `STU`／`TCH`／`PST`／`PAR`／`ADM`。
- 隨機字元取自 32 個字元 `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`（去掉容易看錯的 0/O、1/I），用密碼學安全的亂數產生，
  每種角色約 1.1 兆（32⁸）種組合（前端 `randomCode()`、`INVITE_CODE_LENGTH`）
- 邀請碼就是註冊成該角色（含管理員）的唯一憑證，所以必須猜不到；並配合[嘗試次數限制](#嘗試次數限制)
- 比對不分大小寫、去掉前後空白；先前發出的 4 碼舊邀請碼在到期前仍有效

---

### `DELETE /admin/invite-codes/:code`
**說明**：作廢一組尚未被使用的邀請碼

**權限**：`admin`

**Response**：
```json
{ "success": true }
```

**錯誤**：
- `400 ALREADY_USED`：邀請碼已被使用，無法作廢
- `404 NOT_FOUND`：邀請碼不存在

---

## 9. 年度教學統計 Teaching Stats

> 教師每年度填報自身的教學人次；SS 中央（admin）可查詢所有教師的統計。

### `GET /teaching-stats`
**說明**：取得教學統計列表（可依年度篩選）

**權限**：
- `teacher`：只能查詢自己的統計
- `admin`：可查詢所有人

**Query Params**：
| 參數 | 型別 | 說明 |
|------|------|------|
| `year` | number | 年度篩選（如 `2025`）；不傳則回傳全部 |
| `teacherUsername` | string | 篩選特定教師（`admin` 限定） |

**Response**：
```json
{
  "success": true,
  "data": [
    {
      "teacherUsername": "teacher01",
      "year": 2025,
      "church": "愛與話語",
      "oneOnOne30": 12,
      "oneToMany30": 6,
      "oneOnOneShining": 8,
      "oneToManyShining": 3,
      "submittedAt": "2025-12-31T23:00:00Z"
    }
  ]
}
```

---

### `PUT /teaching-stats/:teacherUsername/:year`
**說明**：教師填報或更新某年度的教學統計（冪等操作，有則更新，無則新增）

**權限**：
- `teacher`：只能填報自己（`:teacherUsername` 必須等於自己）
- `admin`：可代為填報任何教師

**Request Body**：
```json
{
  "oneOnOne30": 12,
  "oneToMany30": 6,
  "oneOnOneShining": 8,
  "oneToManyShining": 3
}
```

**Validation 規則**：
- 所有欄位必填，型別為非負整數（`>= 0`）
- `year` 需合理範圍（2020 ～ 當前年份 + 1）

**Response**：
```json
{
  "success": true,
  "data": {
    "teacherUsername": "teacher01",
    "year": 2025,
    "church": "愛與話語",
    "oneOnOne30": 12,
    "oneToMany30": 6,
    "oneOnOneShining": 8,
    "oneToManyShining": 3,
    "submittedAt": "2025-12-31T23:00:00Z"
  }
}
```

**錯誤**：
- `400 VALIDATION_ERROR`：欄位非整數或為負數
- `403 FORBIDDEN`：教師嘗試填報他人數據

---

### `GET /teaching-stats/summary?year=2025`
**說明**：SS 中央用 — 取得某年度所有教師統計的彙總（含全體合計）

**權限**：`admin`

**Response**：
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "rows": [
      {
        "teacherUsername": "teacher01",
        "realName": "王大明",
        "church": "愛與話語",
        "oneOnOne30": 12,
        "oneToMany30": 6,
        "oneOnOneShining": 8,
        "oneToManyShining": 3,
        "total": 29,
        "submittedAt": "2025-12-31T23:00:00Z"
      }
    ],
    "totals": {
      "oneOnOne30": 120,
      "oneToMany30": 60,
      "oneOnOneShining": 80,
      "oneToManyShining": 30,
      "total": 290
    }
  }
}
```

---

## 10. 聽課預約 Booking System

> **新增於 v1.3.0**  
> 管理「教師為學員安排聽課場次（BookingSession）」及「個別學員出席與回饋（BookingAttendee）」的完整預約流程。

---

### 10.1 預約場次 Booking Sessions

> **誰能看、誰能改**
> - 預約由學員的輔導教師安排與管理（建立、確認時間、取消、完成、備註、新增學員）；
>   能邀請的學員只限該教師看得到的學員（同教會、同性別）
> - 學員只看得到自己被邀請的預約
> - 講師（連結到教師或牧者帳號）看得到自己授課的預約與其中**全部**學員，可記錄出席，但不能改預約本身
> - 同教會的牧者看得到教會的所有預約與學員出席（唯讀，`church` 查詢）；`admin` 看得到全部教會，
>   可不帶 `church` 查全部、或帶 `church` 只看一間（前端 `ChurchBookings.vue`，兩者共用）
> - 男、女教師可各自為自己的學員預約同一堂課（同講師、課程、時段），資料上是兩筆場次；
>   「我的授課」畫面把它們合併成一堂課顯示

#### 取得教師的所有預約場次
```
GET /bookings/sessions?teacherUsername={username}&status={status}
```

| 查詢參數 | 型別 | 必填 | 說明 |
|----------|------|------|------|
| `teacherUsername` | string | 否 | 篩選特定教師建立的場次 |
| `lecturerUsername` | string | 否 | 篩選此帳號擔任講師的場次（透過 `Lecturer.linkedUsername`，即「我的授課」） |
| `church` | string | 否 | 依教會篩選；`pastor` 只能查自己的教會（「教會預約總覽」，唯讀） |
| `status` | string | 否 | `pending \| confirmed \| completed \| cancelled` |

**回應範例**
```json
{
  "success": true,
  "data": [
    {
      "id": "2b9c3f0e-5d1a-4c7e-9a52-6f1d3e8b7a40",
      "courseId": "course_001",
      "courseTitle": "信仰基礎課程",
      "lecturerId": "lec_abc123",
      "lecturerName": "王大明",
      "lecturerTitle": "牧師",
      "teacherUsername": "teacher_wang",
      "proposedAt": "2026-07-15T14:00:00+08:00",
      "confirmedAt": "2026-07-15T14:00:00+08:00",
      "durationMinutes": 90,
      "status": "confirmed",
      "prep": {
        "scriptures": ["約翰福音 1:1-18", "創世紀 1:1"],
        "readingNotes": "請先思考：信仰對你的意義是什麼",
        "materials": "請攜帶聖經"
      },
      "teacherSessionNotes": "",
      "church": "愛與話語",
      "isGroupSession": true,
      "createdAt": "2026-07-01T10:00:00+08:00",
      "updatedAt": "2026-07-02T09:00:00+08:00"
    }
  ]
}
```

#### 取得我擔任講師的預約場次
```
GET /bookings/sessions?lecturerUsername={username}&includeAttendees=true
```

**權限**：只能查詢自己（`lecturerUsername` = 登入者），`admin` 可查任何人

回傳 `lecturerId` 屬於該帳號連結之講師資料、且 `status != cancelled` 的場次，依時間排序；
`includeAttendees=true` 時每筆場次附上**全部**學員（不套用性別規則）與顯示名稱。
對應前端 `bookingsStore.getSessionsByLecturers()`、`useMyLectures()` 與 `TeacherLectureSchedule.vue`。

**待記錄提醒**：時間已過、時間已確認、且仍有學員停在 `invited` 的課（同課程同時段合併計算）算作「待記錄」，
前端在「我的授課」分頁顯示數字並標示這些課。後端可在回應附上 `awaitingAttendanceCount`，或由前端自行計算。

#### 取得學員的預約場次（含出席資料）
```
GET /bookings/sessions?studentUsername={username}
```
回傳該學員所有 BookingAttendee 對應的 Session，並 join attendee 出席資料。

**權限**：學員本人；綁定的家長；看得到這位學員的教師、同教會牧者、`admin`（唯讀）。
家長在孩子的資料抽屜「📅 預約」分頁看到即將到來與過去的預約、出席與取消原因（前端 `StudentBookingsSummary.vue`）。

---

#### 建立預約場次
```
POST /bookings/sessions
```

**權限**：`teacher`、`admin`

**Request Body**
```json
{
  "courseId": "course_001",
  "courseTitle": "信仰基礎課程",
  "lecturerId": "lec_abc123",
  "lecturerName": "王大明",
  "lecturerTitle": "牧師",
  "proposedAt": "2026-07-15T14:00:00+08:00",
  "durationMinutes": 90,
  "prep": {
    "scriptures": ["約翰福音 1:1-18"],
    "readingNotes": "請先思考...",
    "materials": ""
  },
  "studentUsernames": ["student_a", "student_b"],
  "church": "愛與話語"
}
```

**回應**：同取得單一場次的結構，並自動建立對應的 `booking_attendees` 記錄。

---

#### 更新場次狀態
```
PATCH /bookings/sessions/:sessionId/status
```

**Request Body**
```json
{
  "status": "confirmed",
  "confirmedAt": "2026-07-15T14:00:00+08:00",
  "cancelReason": ""
}
```

| status 值 | 說明 |
|-----------|------|
| `pending` | 初始狀態，等待確認 |
| `confirmed` | 時間已確認 |
| `completed` | 課程已完成，回饋已填寫 |
| `cancelled` | 已取消（可附原因） |

---

#### 更新預習內容
```
PATCH /bookings/sessions/:sessionId/prep
```

**Request Body**
```json
{
  "scriptures": ["約翰福音 1:1-18"],
  "readingNotes": "更新說明...",
  "materials": "請攜帶聖經"
}
```

---

#### 完成場次（標記完成並儲存整體備注）
```
POST /bookings/sessions/:sessionId/complete
```

**Request Body**
```json
{
  "teacherSessionNotes": "整體場次順利，學員反應良好"
}
```

---

#### 刪除場次（及所有關聯學員記錄）
```
DELETE /bookings/sessions/:sessionId
```

**權限**：`teacher`（本人）、`admin`

---

### 10.2 場次學員 Booking Attendees

#### 取得場次的所有學員記錄
```
GET /bookings/sessions/:sessionId/attendees
```

**權限與過濾**：
- 安排的教師：只回傳看得到的學員，另附 `hiddenAttendeeCount`（看不到的人數，不含姓名）
- 該場次的講師（連結帳號）、同教會 `pastor`、`admin`：回傳全部學員
- 學員：只回傳自己的那一筆

**回應範例**
```json
{
  "success": true,
  "data": [
    {
      "sessionId": "2b9c3f0e-5d1a-4c7e-9a52-6f1d3e8b7a40",
      "studentUsername": "student_a",
      "attendanceStatus": "attended",
      "studentFeedback": "這次課程讓我對信仰有更深的認識",
      "teacherFeedback": "學員專注，表現積極",
      "feedbackAt": "2026-07-15T16:00:00+08:00",
      "linkedListenSessionId": null,
      "createdAt": "2026-07-01T10:00:00+08:00",
      "updatedAt": "2026-07-15T16:00:00+08:00"
    }
  ]
}
```

---

#### 新增學員至場次
```
POST /bookings/sessions/:sessionId/attendees
```

**Request Body**
```json
{
  "studentUsername": "student_c"
}
```

---

#### 更新學員出席狀態與回饋
```
PATCH /bookings/sessions/:sessionId/attendees/:studentUsername
```

**權限**：
- 安排的教師：可更新看得到的學員的所有欄位
- 該場次的講師（連結帳號）：只能更新 `attendanceStatus`，且場次須已確認時間（`status` 為
  `confirmed` 或 `completed`），否則 `409 BOOKING_NOT_CONFIRMED`；可更新任何學員（不分性別）
- 學員：只能更新自己的 `studentFeedback`

**Request Body**
```json
{
  "attendanceStatus": "attended",
  "teacherFeedback": "表現良好，繼續加油",
  "studentFeedback": "收穫很多，感謝老師",
  "linkedListenSessionId": "listen_sess_xyz"
}
```

| attendanceStatus 值 | 說明 |
|---------------------|------|
| `invited` | 已邀請，尚未確認出席 |
| `attended` | 已出席 |
| `absent` | 缺席 |

---

### 10.3 API 端點一覽

| 功能 | 方法 | 路徑 |
|------|------|------|
| 取得場次列表 | `GET` | `/bookings/sessions` |
| 我的授課（講師） | `GET` | `/bookings/sessions?lecturerUsername=` |
| 建立新場次 | `POST` | `/bookings/sessions` |
| 更新場次狀態 | `PATCH` | `/bookings/sessions/:id/status` |
| 更新預習內容 | `PATCH` | `/bookings/sessions/:id/prep` |
| 完成場次 | `POST` | `/bookings/sessions/:id/complete` |
| 刪除場次 | `DELETE` | `/bookings/sessions/:id` |
| 取得場次學員 | `GET` | `/bookings/sessions/:id/attendees` |
| 新增學員 | `POST` | `/bookings/sessions/:id/attendees` |
| 更新學員回饋 | `PATCH` | `/bookings/sessions/:id/attendees/:username` |

---

## 11. 資料模型定義

### User（使用者）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | string | 系統唯一 ID（UUID） |
| `username` | string | 登入帳號（唯一，英數字） |
| `passwordHash` | string | 密碼雜湊值（bcrypt，後端儲存，不回傳） |
| `role` | `student` \| `teacher` \| `pastor` \| `parent` \| `admin` | 角色 |
| `church` | string | 所屬教會名稱 |
| `displayName` | string? | 暱稱（公開顯示） |
| `realName` | string? | 真實姓名（管理端顯示，不對其他學員公開） |
| `loginMethod` | `credentials` \| `google` \| `line` | 首次登入方式；社群帳號沒有密碼 |
| `email` | string? | 選填，可用來登入；小寫儲存，不可重複 |
| `emailVerified` | boolean | 信箱是否已驗證（規劃中，見[帳號與信箱](#帳號與信箱規劃)） |
| `mustChangePassword` | boolean | 管理員設定的密碼，須在下次登入時更換 |
| `gender` | `male` \| `female` \| null | 性別，只用於 `student`、`teacher`；null = 未設定 |
| `childUsernames` | string[]? | 只用於 `parent`：綁定的孩子（後端對應 `parent_children` 表） |
| `avatarUrl` | string? | 頭像 URL |
| `isActive` | boolean | 是否啟用（false = 軟刪除） |
| `lastLoginAt` | ISO8601? | 最後登入時間 |
| `createdAt` | ISO8601 | 建立時間 |
| `updatedAt` | ISO8601 | 最後更新時間 |

### ListenSession（聽課紀錄）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | string | 唯一 ID（UUID 或時間戳） |
| `username` | string | 學員帳號（FK → User） |
| `courseId` | string | 課程 ID（FK → Course） |
| `lecturer` | string | 授課講師名稱（自由文字，來自講師名稱+職稱） |
| `listenedAt` | `YYYY-MM-DDTHH:mm` | 學員填報的聆聽時間 |
| `notes` | string | 學員心得（可為空） |
| `createdAt` | ISO8601 | 系統建立時間 |
| `updatedAt` | ISO8601? | 最後修改時間（null 表示從未修改） |

### Course（課程）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | string | 唯一 ID（格式：`bible-01`, `lecture-01`） |
| `title` | string | 課程名稱 |
| `category` | `bible` \| `lecture` | 分類 |
| `description` | string | 課程說明 |
| `coverColor` | string | 卡片封面 CSS 顏色/漸層 |
| `duration` | number | 課程時長（秒） |

### Lecturer（講師）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | string | 唯一 ID |
| `name` | string | 講師顯示名稱 |
| `title` | string | 稱謂代碼（`pastor`、`preacher`、`elder`…，見 `POST /lecturers`） |
| `church` | string | 所屬教會 |
| `courseIds` | string[] | 可授課的課程 ID 清單（用於篩選建議講師） |
| `linkedUsername` | string? | 連結的教師或牧者帳號（FK → users.username）；空則為外來/自訂講師。連結後該帳號有「我的授課」 |

### StudentAssignment（關懷配對）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `studentUsername` | string | 學員帳號（FK） |
| `teacher` | string? | 輔導教師帳號（FK） |
| `pastor` | string? | 分區牧者帳號（FK） |
| `updatedAt` | ISO8601 | 最後更新時間 |

### BookingSession（預約場次）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | string | 唯一 ID |
| `courseId` / `courseTitle` | string | 課程（名稱冗餘保存，課程改名或刪除後仍可顯示） |
| `lecturerId` / `lecturerName` / `lecturerTitle` | string | 講師（同上冗餘保存；`lecturerTitle` 為稱謂代碼） |
| `teacherUsername` | string | 安排預約的教師 |
| `proposedAt` | 牆上時間 | 提議時間，如 `2026-06-25T14:00`（以 `Asia/Taipei` 解讀，見資料庫文件 5.14） |
| `confirmedAt` | 牆上時間? | 確認後的時間 |
| `durationMinutes` | number | 預計時長（分鐘） |
| `status` | `pending` \| `confirmed` \| `completed` \| `cancelled` | 狀態 |
| `cancelReason` | string? | 取消原因（學員看得到） |
| `prep` | `{ scriptures: string[], readingNotes: string, materials: string }` | 預習內容 |
| `teacherSessionNotes` | string | 完成後的整體備註 |
| `church` | string | 教會 |
| `isGroupSession` | boolean | 是否多人場次 |
| `createdAt` / `updatedAt` | ISO8601 | 系統時間 |

### BookingAttendee（場次學員）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `sessionId` | string | 所屬場次 |
| `studentUsername` | string | 學員 |
| `attendanceStatus` | `invited` \| `attended` \| `absent` | 出席狀態 |
| `studentFeedback` | string | 學員心得（學員或教師代填） |
| `teacherFeedback` | string | 教師對此學員的回饋 |
| `feedbackAt` | ISO8601? | 回饋時間 |
| `linkedListenSessionId` | string? | 連結的聽課紀錄（選填） |

### InviteCode（邀請碼）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `code` | string | 如 `SS-TCH-K7M2QX9D`（格式見 `POST /admin/invite-codes`） |
| `role` | 角色 | 以此碼註冊的角色 |
| `church` | string? | 指定教會（`admin` 為空） |
| `createdBy` | string | 產生的管理員 |
| `createdAt` / `expiresAt` | ISO8601 | 產生與到期時間 |
| `usedBy` / `usedAt` | string? / ISO8601? | 使用者與使用時間 |
| `revoked` | boolean | 是否已作廢 |

### CourseFeedback（心得回覆）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | string | 唯一 ID |
| `author` | string | 回覆的教師、牧者或管理員帳號 |
| `message` | string | 內容 |
| `createdAt` | ISO8601 | 時間；學員的「新回覆」依此與已讀時間比較 |

### ShiningProject（閃耀計畫）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `name` / `birthday` / `church` / `schoolGrade` | string | 基本資料（學員自填） |
| `faithPhase1` | `{ worship, prayer, independent, reply, share }` | 信仰指標第一階段（布林值） |
| `faithPhase2` | `{ courses30, prayerLong, morningWorship, readBible, churchService }` | 第二階段；`courses30` 見 `PATCH /shining/:username` |
| `advancedChallenges` | `{ wednesday, shareFaith, copySermon, morningProverb, custom }` | 進階挑戰 |
| `customChallenge` | string | 自訂挑戰內容 |
| `characterLectures` / `comingOfAgeTopics` | `{ [主題名稱]: { speaker, date } }` | 專題講座登記（依主題名稱，見「專題主題」） |

### Theme（專題主題）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `id` | string | 唯一 ID |
| `church` | string | 教會 |
| `type` | `character` \| `comingOfAge` | 品格力或成年禮 |
| `name` | string | 主題名稱 |
| `sortOrder` | number | 顯示順序 |

---

## 12. 錯誤碼一覽

> 前端依 `error.code` 顯示使用者目前語系的訊息（`src/i18n/locales/*.json` 的 `api.codes.*`），
> 所以後端的 `error.message` 主要給開發者看；`VALIDATION_ERROR` 例外，前端直接顯示後端訊息，
> 請在訊息中指出哪個欄位有問題。新增錯誤碼時請一併補上中英文訊息，
> `src/i18n/__tests__/apiCodes.spec.ts` 會檢查這張表的每個錯誤碼都有翻譯。

| HTTP 狀態碼 | 錯誤碼 | 中文說明 |
|-------------|--------|---------|
| 400 | `VALIDATION_ERROR` | 請求參數格式錯誤或驗證失敗 |
| 429 | `TOO_MANY_REQUESTS` | 嘗試次數過多，暫時鎖住；`Retry-After` 標頭為需等待的秒數（見[嘗試次數限制](#嘗試次數限制)） |
| 400 | `INVALID_DATE_FORMAT` | 日期時間格式不正確 |
| 400 | `INVALID_STATUS_TRANSITION` | 場次狀態流轉不合法（如已完成場次不可再確認） |
| 401 | `UNAUTHORIZED` | 未提供 Token 或 Token 無效 |
| 401 | `INVALID_CREDENTIALS` | 帳號或密碼錯誤 |
| 401 | `USE_SOCIAL_LOGIN` | 帳號沒有密碼，請用 Google / LINE 登入 |
| 401 | `TOKEN_EXPIRED` | Access Token 已過期，請呼叫 /auth/refresh |
| 401 | `REFRESH_TOKEN_EXPIRED` | Refresh Token 已過期，需重新登入 |
| 403 | `FORBIDDEN` | 有登入但無權限執行此操作 |
| 403 | `STUDENT_NOT_VISIBLE` | 依可見範圍規則看不到此學員（如指派異性學員給教師） |
| 409 | `BOOKING_NOT_CONFIRMED` | 場次時間尚未確認，講師還不能記錄出席 |
| 403 | `ACCOUNT_DISABLED` | 帳號已被停用（isActive = false） |
| 404 | `USER_NOT_FOUND` | 找不到此使用者 |
| 404 | `COURSE_NOT_FOUND` | 找不到此課程 |
| 404 | `SESSION_NOT_FOUND` | 找不到此聽課紀錄 |
| 404 | `BOOKING_SESSION_NOT_FOUND` | 找不到此預約場次 |
| 404 | `BOOKING_ATTENDEE_NOT_FOUND` | 找不到此場次的學員記錄 |
| 404 | `LECTURER_NOT_FOUND` | 找不到此講師 |
| 404 | `STATS_NOT_FOUND` | 找不到此年度教學統計 |
| 409 | `USERNAME_TAKEN` | 帳號名稱已被使用（不分大小寫） |
| 409 | `EMAIL_TAKEN` | 信箱已被其他帳號使用 |
| 409 | `THEME_EXISTS` | 同一教會已有同名的專題主題 |
| 400 | `WEAK_PASSWORD` | 密碼不符合密碼規則（見 `POST /auth/register`） |
| 403 | `PASSWORD_CHANGE_REQUIRED` | 須先修改管理員設定的密碼 |
| 409 | `ATTENDEE_ALREADY_EXISTS` | 該學員已加入此場次 |
| 500 | `INTERNAL_ERROR` | 伺服器內部錯誤 |

---

## 13. 前端串接遷移指南

> 目前前端使用 `localStorage` 作為臨時資料庫，後端串接後需逐步替換。

### localStorage → API 對照表

| 前端 localStorage Key | 對應 API 端點 |
|----------------------|--------------|
| `superstart_user` | `GET /auth/me` |
| `superstart_users_db` | `GET /admin/users` |
| `superstart_progress_db` | `GET /progress/:username` |
| `superstart_lecturers_db` | `GET /lecturers` |
| `superstart_student_teacher_db` | `GET /assignments/:studentUsername` |
| `superstart_shining_project_db` | `GET /shining/:username` |
| `superstart_restrictions_db` | `GET /admin/page-restrictions/:username` |
| `superstart_character_themes_db` | 建議新增：`GET /themes?type=character&church=...` |
| `superstart_coming_of_age_themes_db` | 建議新增：`GET /themes?type=comingOfAge&church=...` |
| `superstart_teaching_stats_db` | `GET /teaching-stats` / `PUT /teaching-stats/:username/:year` |
| `superstart_booking_sessions_db` | `GET /bookings/sessions` / `POST /bookings/sessions` |
| `superstart_booking_attendees_db` | `GET /bookings/sessions/:id/attendees` / `PATCH /bookings/sessions/:id/attendees/:username` |
| `superstart_invite_codes` | `GET` / `POST /admin/invite-codes`、`DELETE /admin/invite-codes/:code` |
| `superstart_feedback_db` | `GET` / `POST /progress/:username/:courseId/feedback` |
| `superstart_feedback_seen_db` | `GET /progress/:username/feedback/unread`、`POST .../feedback/seen` |
| `superstart_retired_usernames` | 不需要 API：已停用的帳號列仍在，名稱的唯一限制照常生效 |

以下只屬於這台裝置，接上後端後仍留在瀏覽器（不對應 API）：`superstart_session`（登入期限計時）、
`superstart_lang`（語言）、`superstart_last_backup_at`（上次備份時間）；`superstart_user` 改由 `GET /auth/me` 取得。

### Store 函式 → API 對照表

| 前端 Store 函式 | 對應 API 呼叫 |
|----------------|--------------|
| `addListenSession()` | `POST /progress/:username/:courseId/sessions` |
| `updateListenSession()` | `PATCH /progress/:username/:courseId/sessions/:sessionId` |
| `getStudentProgress()` | `GET /progress/:username/:courseId/sessions` |
| `assignStudentCaretaker()` | `PUT /assignments/:studentUsername` |
| `removeStudentCaretaker()` | `DELETE /assignments/:studentUsername/:role` |
| `getShiningProject()` | `GET /shining/:username` |
| `updateShiningBasicInfo()` | `PATCH /shining/:username` |
| `addLecturer()` | `POST /lecturers` |
| `updateLecturer()` | `PUT /lecturers/:lecturerId` |
| `deleteLecturer()` | `DELETE /lecturers/:lecturerId` |
| `toggleRestriction()` | `POST /admin/page-restrictions/:username/toggle` |
| `saveTeachingStats()` | `PUT /teaching-stats/:username/:year` |
| `getTeachingStats()` | `GET /teaching-stats?teacherUsername=...&year=...` |
| `getAllTeachingStats()` | `GET /teaching-stats/summary?year=...` |
| `bookingsStore.createSession()` | `POST /bookings/sessions` |
| `bookingsStore.updateSessionStatus()` | `PATCH /bookings/sessions/:id/status` |
| `bookingsStore.updatePrep()` | `PATCH /bookings/sessions/:id/prep` |
| `bookingsStore.completeSession()` | `POST /bookings/sessions/:id/complete` |
| `bookingsStore.updateAttendee()` | `PATCH /bookings/sessions/:id/attendees/:username` |
| `bookingsStore.addAttendeeToSession()` | `POST /bookings/sessions/:id/attendees` |
| `bookingsStore.deleteSession()` | `DELETE /bookings/sessions/:id` |
| `bookingsStore.getSessionsByTeacher()` | `GET /bookings/sessions?teacherUsername=...` |
| `bookingsStore.getSessionsByLecturers()` | `GET /bookings/sessions?lecturerUsername=...` |
| `coursesStore.getFeedback()` / `addFeedback()` | `GET` / `POST /progress/:username/:courseId/feedback` |
| `coursesStore.coursesWithUnreadFeedback()` / `markFeedbackSeen()` | `GET /progress/:username/feedback/unread` / `POST .../feedback/seen` |
| `bookingsStore.cancelOpenSessionsOf()` | 由 `DELETE /admin/users/:username` 在後端處理 |
| `authStore.setGender()` | `PUT /users/:username/gender` |
| `authStore.bindChild()` / `unbindChild()` | `PUT` / `DELETE /parents/:parentUsername/children/:studentUsername` |
| `authStore.parentsOf()` / `childrenOf()` | `GET /students/:studentUsername/parents` / `GET /parents/:parentUsername/children` |
| `useAccountCleanup().releaseRole()` | `DELETE /admin/users/:username`、`PUT /admin/users/:username`（改角色）在後端處理 |
| `utils/scope.ts`（`canViewStudent` / `canViewAttendee` 等） | 後端每個學員相關 API 的授權過濾 |
| `bookingsStore.getUpcomingSessions()` | `GET /bookings/sessions?studentUsername=...&upcoming=true` |
| `bookingsStore.getPastSessions()` | `GET /bookings/sessions?studentUsername=...&past=true` |
| `authStore.login()` / `logout()` | `POST /auth/login`（含 `rememberMe`）/ `POST /auth/logout` |
| `authStore.register()` | `POST /auth/register` |
| `authStore.exchangeOAuthCode()` / `completeProfile()` | `POST /auth/exchange` / `PUT /auth/complete-profile` |
| `authStore.updateProfile()` | `PATCH /auth/me` |
| `authStore.updatePassword()` | `POST /auth/reset-password`（改自己的密碼） |
| `authStore.adminResetPassword()` | `PUT /admin/users/:username`（`password`） |
| `authStore.createAccount()` | `POST /admin/users` |
| `authStore.deleteAccount()` | `DELETE /admin/users/:username` |
| `authStore.generateInviteCode()` / `revokeInviteCode()` | `POST /admin/invite-codes` / `DELETE /admin/invite-codes/:code` |
| `authStore.consumeInviteCode()` | 由 `POST /auth/register`、`PUT /auth/complete-profile` 在後端處理 |
| `authStore.unbindChildEverywhere()`、`coursesStore.releaseStudent()` / `releaseCaretaker()` / `unlinkLecturerAccount()` | 由 `DELETE` / `PUT /admin/users/:username` 在後端處理（同 `releaseRole()`） |
| `coursesStore.updateShiningChecklist()` / `updateShiningCustomChallenge()` / `updateShiningLecture()` | `PATCH /shining/:username`（只傳變更的欄位） |
| `coursesStore.addTheme()` / `updateTheme()` / `deleteTheme()` | `POST` / `PUT` / `DELETE /themes` |
| `bookingsStore.updateSessionProp()` | 依欄位對應 `PATCH /bookings/sessions/:id/status` 或 `/prep` |

### 搬移既有資料

後端上線時，請管理員在前端「資料備份」匯出一份備份檔（JSON），依資料庫文件
[第 9 節「從前端備份搬移資料」](./database_schema.md#9-從前端備份搬移資料) 搬進資料庫。重點：
密碼在前端是明碼，搬移時須雜湊並要求大家換密碼；前端的 ID 須換成 UUID 並保留對照；牆上時間以 `Asia/Taipei` 解讀。

### Token 管理策略

```
Access Token 有效期：1 小時（建議）
Refresh Token 有效期：30 天（建議）

自動刷新流程：
1. 登入 → 取得 accessToken + refreshToken，存入 localStorage
2. 每次 API 請求，在 axios 攔截器中自動帶入 Authorization header
3. 若收到 401 TOKEN_EXPIRED，自動呼叫 POST /auth/refresh 換發新 Token
4. 若換發失敗（REFRESH_TOKEN_EXPIRED），清除 Token，導向登入頁
```

#### 記住我與閒置登出

教會常用共用的電腦或平板，所以登入狀態有期限（前端 `src/utils/session.ts`）：

| | 未勾「記住我」（預設） | 勾選「記住我」 |
|---|---|---|
| 閒置多久登出 | 2 小時 | 30 天 |
| 關閉瀏覽器後 | 需重新登入 | 仍保持登入 |

- `POST /auth/login` 帶 `"rememberMe": true/false`；社群登入一律視為未勾選
- 後端對應：未勾選時 Refresh Token 有效期 2 小時、每次換發時重新計算（閒置期限）；勾選時 30 天。
  前端另會在閒置到期與瀏覽器重新開啟時自行登出，但**期限必須由後端執行**，前端的計時只是讓畫面即時反映
- 前端以 `localStorage` 保存登入（各分頁共用），以 `sessionStorage` 與 `BroadcastChannel` 判斷瀏覽器是否關閉過

#### 帳號變更時結束既有的登入

管理員**停用（刪除）帳號、更改角色、重設密碼**，或使用者**自己改密碼**時，該帳號既有的登入不能沿用到 Token 到期：
否則被降級或停用的人在 Access Token 的 1 小時、Refresh Token 的 30 天內仍以原本的身分操作。後端須：

1. **撤銷該帳號所有的 Refresh Token**（使用者自己改密碼時，保留目前這個工作階段的即可）。
2. **每次請求都以資料庫為準**檢查帳號是否仍啟用、角色為何，不能只信 Access Token 裡記載的角色：
   - 帳號已停用 → `403 ACCOUNT_DISABLED`
   - Token 簽發後角色已變更或密碼已重設 → `401 TOKEN_EXPIRED`，前端換發失敗後導向登入頁
   - 建議在 `users` 加上 `token_version`（或 `credentials_changed_at`），上述操作時遞增，Token 帶著簽發時的版本，
     版本不符即視為失效；這也讓 `POST /auth/refresh` 不會換發出帶舊角色的 Token。
3. `POST /auth/refresh` 換發時同樣重新讀取帳號狀態與角色。

### 前端串接步驟

前端已有呼叫 API 的共用工具 `src/utils/api.ts`（以 `fetch` 實作，不需另裝 axios）：
`apiGet` / `apiPost` / `apiPut` / `apiPatch` / `apiDelete` 會自動帶上 Access Token、遇到 `401` 時換發一次再重試、
15 秒逾時、可取消，並把第 12 節的錯誤碼依目前語系翻譯成 `ApiError`（`429` 會依 `Retry-After` 顯示等待時間）。

1. **設定 API 網址**：在 `.env.production` 設定 `VITE_API_BASE_URL` 並**重新建置**（網站的 CSP 只允許連線到這個網址）；
   正式環境同時把 `VITE_DEMO_MODE` 設為 `false`
2. **啟用 Token 換發**：取消 `src/utils/api.ts` 中 `refreshToken()` 已寫好、被註解的 `fetch` 區塊
3. **登入與社群登入**：替換 `src/stores/auth.ts` 中標示 `TODO（後端就緒後）` 的 mock（`login()`、`exchangeOAuthCode()`、`completeProfile()`）
4. **逐步替換各 Store**：依上方兩張對照表，把讀寫 `localStorage` 的地方改為呼叫 `apiGet` / `apiPost` 等；
   `bookings.ts` 與其他 store 無相依，可先串接 `/bookings/*`
5. **權限以後端為準**：前端的可見範圍（`src/utils/scope.ts`）、登入期限（`src/utils/session.ts`）只是讓畫面即時反映，
   後端回 `401` / `403` 時以後端為準
6. **搬移既有資料**：依上方〈搬移既有資料〉與資料庫文件第 9 節

---

## 版本紀錄

### v1.8.1（2026-11-14）整理文件

- 各版本的異動摘要從文件開頭移到這裡；移除標示新增項目的 ⭐ / NEW 記號（各版本新增了什麼以這裡為準）
- 第 13 節〈前端串接步驟〉改寫為目前的實作：前端已有 `src/utils/api.ts`（`fetch`），不需另裝 axios
- 文件開頭加上相關文件連結；新增 [`docs/README.md`](./README.md) 文件導覽

### v1.8.0（2026-11-11）帳號安全、登入期限、補齊端點

- 新增 `PATCH /auth/me`：使用者修改自己的暱稱、姓名、頭像（只接受 `https://`）、信箱
- 新增專題主題 `GET` / `POST` / `PUT` / `DELETE /themes`（前端早已可管理，原本只有「建議新增」）
- `GET /auth/me` 補齊 `email`、`mustChangePassword`、`loginMethod`、`realName`、`childUsernames`、`lastLoginAt`
- 新增[密碼規則](#密碼規則)與 `400 WEAK_PASSWORD`；登入時帳號不存在與密碼錯誤一律回 `INVALID_CREDENTIALS`
- 新增[嘗試次數限制](#嘗試次數限制)與 `429 TOO_MANY_REQUESTS`（含 `Retry-After`）
- 新增[記住我與閒置登出](#記住我與閒置登出)（`rememberMe`）與[帳號變更時結束既有的登入](#帳號變更時結束既有的登入)
- 新增[跨網域（CORS）](#跨網域cors)：前端與 API 不同網域時的設定
- 社群帳號不可設定或重設密碼（`POST /auth/reset-password`、`PUT /admin/users/:username`）
- 刪除（停用）帳號後名稱不可重新使用；邀請碼隨機部分改為 8 碼（[格式](#post-admininvite-codes)）
- 講師稱謂改為代碼（`pastor`、`preacher`…），由前端依語言翻譯
- 第 11 節補上預約、出席、邀請碼、心得回覆、閃耀計畫、主題的資料模型；第 13 節對照表補齊，
  並說明如何以前端匯出的備份檔搬移既有資料

### v1.7.0（2026-11-02）帳號與信箱

- 帳號規則：小寫、3–30 字元、只用英數字與 `. _ -`，比對不分大小寫（前端 `src/utils/account.ts`）
- 信箱選填、不可重複，可用來登入：`POST /auth/login` 的 `identifier` 可填帳號或信箱
- 管理員建立帳號或重設密碼後 `mustChangePassword = true`，使用者須先改密碼才能使用其他 API
- 新增心得回覆：`GET` / `POST /progress/:username/:courseId/feedback`
- 規劃中（需後端）：信箱驗證、寄信重設密碼、社群帳號只在雙方信箱都已驗證時自動合併，見[帳號與信箱](#帳號與信箱規劃)

### v1.6.0（2026-10-30）

- 新增[可見範圍規則](#可見範圍規則誰看得到誰)：教師與學員依性別分開管理，牧者以上看整體，以教會為單位；講師在自己授課的預約中看得到全部學員
- `User` 新增 `gender`；新增 `PUT /users/:username/gender`
- 家長綁定改為獨立的 `/parents/:parentUsername/children`，`/assignments` 不再有 `parent`
- `DELETE /admin/users/:username` 與更改角色時，會清理仍指向該帳號的指派、講師連結與預約
- 預約新增 `GET /bookings/sessions?lecturerUsername=`（我的授課）；講師可更新出席狀態

---

*本文件由前端團隊依前端實作整理維護。前端或後端調整欄位、規則時，請同步更新本文件（版本號、〈版本紀錄〉），並通知前後端雙方確認後再上線。*
