# SuperStart 後端 API 設計規格書

> 本文件定義了 SuperStart 聖經課程與講座紀錄平台的後端 API 邏輯，供後端開發人員或 AI Agent 參考實作。
> 目前前端以 Vue 3 + Pinia + localStorage 模擬資料層，未來將逐步替換為真正的後端 API。

---

## 目錄
1. [資料模型 (Data Models)](#1-資料模型-data-models)
2. [教會清單 (Churches)](#2-教會清單-churches)
3. [API 端點 (Endpoints)](#3-api-端點-endpoints)
4. [權限矩陣 (Permissions Matrix)](#4-權限矩陣-permissions-matrix)
5. [教會隔離邏輯 (Church Isolation)](#5-教會隔離邏輯-church-isolation)
6. [前端目前的 localStorage 資料結構](#6-前端目前的-localstorage-資料結構)

---

## 1. 資料模型 (Data Models)

### 1.1 User (使用者)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `username` | string | ✅ | 使用者帳號 (唯一 primary key) |
| `passwordHash` | string | ✅ | 密碼 hash |
| `role` | enum | ✅ | 角色: `student`, `teacher`, `parent`, `pastor`, `admin` |
| `church` | string | 條件 | 所屬教會名稱。`admin` 角色不需要，其他角色必填 |
| `childUsernames` | string[] | 條件 | 家長綁定的學員帳號列表。僅 `parent` 角色使用 |
| `loginMethod` | enum | ✅ | 登入方式: `credentials`, `google`, `line` |
| `avatarUrl` | string | ❌ | 頭像 URL |
| `createdAt` | datetime | ✅ | 註冊時間 |

**角色說明：**
- `student` (SS學員)：可填寫聽課心得、自我檢視閃耀計畫
- `teacher` (輔導老師)：管理同教會學員、登記專題課、回饋心得
- `parent` (關懷家長)：僅能查看自己綁定的學員資料（唯讀）
- `pastor` (分區牧者)：查看整個教會的教師/學員概況、可編輯學員資料
- `admin` (SS中央)：跨教會查看所有資料、管理所有帳號與權限

### 1.2 Course (課程)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 課程 ID (格式: `bible-01`, `lecture-01`) |
| `title` | string | ✅ | 課程標題 |
| `category` | enum | ✅ | 分類: `bible` (聖經課程), `lecture` (專題講座) |
| `speaker` | string | ✅ | 預設講員 |
| `duration` | number | ✅ | 課程時長 (秒) |
| `description` | string | ✅ | 課程描述 |
| `coverColor` | string | ✅ | 卡片封面顏色 (CSS gradient) |

**課程清單 (30 堂，固定)：**
- 聖經課程 15 堂: 聖經時觀、日月停止、彼得與釣魚、以利亞與烏鴉飯、三分說、七階段法則、火之概念、末世論、比喻論、洪水審判、無知中的相剋世界、預定論、異端的概念、中心人物論、復活論
- 專題講座 15 堂: 三位一體、聖子論、再臨論、空提論、啟示論、靈界論、撒旦論、該隱的個性、罪與悔改、創造目的、墮落論、施洗約翰與耶穌的關係使命、兩棵橄欖樹與兩個見證人、歷史論、一載二載半載

### 1.3 ProgressRecord (聽課進度紀錄)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `username` | string | ✅ | 學員帳號 (FK → User) |
| `courseId` | string | ✅ | 課程 ID (FK → Course) |
| `durationListened` | number | ✅ | 聽課時長 (秒) |
| `completed` | boolean | ✅ | 是否已完成此課程 |
| `notes` | string | ❌ | 學員的聽課心得筆記 |
| `lastUpdated` | string | ✅ | 最後更新時間 |
| `listenedAt` | string | ❌ | 學員登記的聽課日期時間 |
| `lecturer` | string | ❌ | 學員選擇的授課講師名稱 |

**複合主鍵：** `(username, courseId)`

### 1.4 StudentCaretakers (輔導配對)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `studentUsername` | string | ✅ | 學員帳號 (FK → User) |
| `teacher` | string | ❌ | 負責的輔導老師帳號 |
| `pastor` | string | ❌ | 負責的分區牧者帳號 |
| `parent` | string | ❌ | 負責的關懷家長帳號 |

**主鍵：** `studentUsername`

### 1.5 ShiningProject (閃耀計畫)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `username` | string | ✅ | 學員帳號 (FK → User) |
| `name` | string | ❌ | 姓名 |
| `birthday` | string | ❌ | 生日 |
| `church` | string | ❌ | 教會 |
| `schoolGrade` | string | ❌ | 學校/年級 |
| `faithPhase1` | object | ✅ | 信仰指標 Phase 1 (5 個布林值) |
| `faithPhase2` | object | ✅ | 信仰指標 Phase 2 (5 個布林值) |
| `advancedChallenges` | object | ✅ | 進階挑戰 (5 個布林值) |
| `customChallenge` | string | ❌ | 自訂挑戰文字 |
| `characterLectures` | object | ✅ | 品格力專題 { theme: { speaker, date } } |
| `comingOfAgeTopics` | object | ✅ | 成年禮專題 { theme: { speaker, date } } |

### 1.6 Lecturer (講師)

| 欄位 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `id` | string | ✅ | 講師 ID |
| `name` | string | ✅ | 講師姓名 |
| `title` | string | ✅ | 稱號 (牧師/傳道/長老/輔導/老師) |
| `courseIds` | string[] | ✅ | 可講授的課程 ID 列表 |
| `church` | string | ❌ | 講師所屬教會，用於隔離顯示 |

**說明：** 講師資料依教會隔離。

### 1.7 DynamicThemes (動態專題大綱)

| 欄位 | 類型 | 說明 |
|------|------|------|
| `characterThemesDb` | Record<string, string[]> | 依教會隔離的品格力專題清單 |
| `comingOfAgeThemesDb` | Record<string, string[]> | 依教會隔離的成年禮必修專題清單 |

**說明：** 各教會擁有獨立的專題大綱，由該教會的教師/牧者進行管理。

---

## 2. 教會清單 (Churches)

以下為系統支援的教會列表（固定，未來可由 Admin 維護）：

| # | 教會名稱 |
|---|---------|
| 1 | 愛與話語 (預設) |
| 2 | 主大明 |
| 3 | 主勝利 |
| 4 | 主生命 |
| 5 | 主和睦光 |
| 6 | 台北主話語 |
| 7 | 聖靈 |
| 8 | 永明 |
| 9 | 主希望光 |
| 10 | 實踐 |
| 11 | 主愛 |
| 12 | 主大永 |
| 13 | 主磐石 |
| 14 | 信主 |
| 15 | 宜蘭主話語 |
| 16 | 天民 |
| 17 | 主幸福 |
| 18 | 信榮 |
| 19 | 主盼望 |

---

## 3. API 端點 (Endpoints)

### 3.1 認證 (Auth)

#### `POST /api/auth/login`
- **描述**：帳號密碼登入
- **Request Body**：`{ username: string, password: string }`
- **Response**：`{ success: boolean, message: string, user?: User }`
- **權限**：公開

#### `POST /api/auth/register`
- **描述**：註冊新帳號
- **Request Body**：
  ```json
  {
    "username": "string",
    "password": "string",
    "role": "student | teacher | parent | pastor | admin",
    "church": "string (非 admin 必填)",
    "childUsernames": ["string"] // 僅 parent 角色必填
  }
  ```
- **驗證邏輯**：
  - `username` 不可重複
  - `role` 非 `admin` 時，`church` 為必填且必須在教會清單內
  - `role` 為 `parent` 時，`childUsernames` 至少須包含一位已存在的 `student` 帳號，且這些學員必須與家長所選的 `church` 相同。
- **Response**：`{ success: boolean, message: string, user?: User }`
- **權限**：公開

#### `POST /api/auth/oauth`
- **描述**：第三方 OAuth 登入 (Google / LINE)
- **Request Body**：`{ provider: 'google' | 'line', token: string, role: UserRole, church?: string, childUsernames?: string[] }`
- **Response**：`{ success: boolean, user?: User }`
- **權限**：公開

#### `POST /api/auth/logout`
- **描述**：登出
- **權限**：已認證

---

### 3.2 使用者管理 (Users)

#### `GET /api/users`
- **描述**：取得使用者清單
- **Query Parameters**：`role?: string`, `church?: string`
- **權限**：`admin` (全部), `pastor` (同教會), `teacher` (同教會 student 與 teacher)
- **教會隔離**：非 admin 角色僅返回同教會成員

#### `GET /api/users/:username`
- **描述**：取得特定使用者資訊
- **權限**：本人、`admin`、同教會 `teacher`/`pastor`
- **教會隔離**：非 admin 只能查看同教會成員

#### `PATCH /api/users/:username/role`
- **描述**：變更使用者角色
- **Request Body**：`{ role: UserRole }`
- **權限**：僅 `admin`

#### `PATCH /api/users/:username/password`
- **描述**：變更使用者密碼
- **Request Body**：`{ oldPassword: string, newPassword: string }`
- **權限**：本人或 `admin` (admin 可直接重設密碼而不需原密碼)

#### `DELETE /api/users/:username`
- **描述**：刪除使用者
- **權限**：僅 `admin`

#### `GET /api/users/students?church=xxx`
- **描述**：取得某教會的所有學員帳號列表
- **權限**：`admin` (任何教會), `pastor`/`teacher` (僅同教會)

#### `GET /api/users/teachers?church=xxx`
- **描述**：取得某教會的所有教師帳號列表
- **權限**：`admin` (任何教會), `pastor` (僅同教會)

---

### 3.3 課程 (Courses)

#### `GET /api/courses`
- **描述**：取得所有課程清單
- **權限**：已認證

#### `GET /api/courses/:courseId`
- **描述**：取得特定課程資訊
- **權限**：已認證

---

### 3.4 聽課進度 (Progress)

#### `GET /api/progress/:username`
- **描述**：取得某學員的所有課程進度
- **權限**：本人 (`student`)、負責的 `teacher`/`pastor`/`parent`、`admin`
- **教會隔離**：`teacher`/`pastor` 只能查看同教會學員

#### `PUT /api/progress/:username/:courseId`
- **描述**：更新學員的聽課進度
- **Request Body**：
  ```json
  {
    "durationListened": 180,
    "notes": "心得內容",
    "listenedAt": "2026-06-01T10:00",
    "lecturer": "張牧師"
  }
  ```
- **權限**：本人 (`student`)、負責的 `teacher` (可更正)
- **說明**：提交後自動將 `completed` 設為 `true`

---

### 3.5 輔導配對 (Caretakers)

#### `GET /api/caretakers/:studentUsername`
- **描述**：取得某學員的配對輔導資訊
- **Response**：`{ teacher?: string, pastor?: string, parent?: string }`
- **權限**：相關人員 (`student` 本人、配對的 `teacher`/`pastor`/`parent`、`admin`)

#### `PUT /api/caretakers/:studentUsername`
- **描述**：設定或更新學員的配對
- **Request Body**：`{ role: 'teacher' | 'pastor' | 'parent', username: string }`
- **權限**：`teacher` (設定自己為 teacher)、`pastor`、`admin`
- **教會隔離**：`teacher`/`pastor` 只能配對同教會學員
- **資料一致性**：當指定或變更 `parent` 時，必須同步更新該 `parent` 帳號的 `childUsernames` 陣列，確保家長儀表板的檢視權限與配對資料保持一致。

#### `DELETE /api/caretakers/:studentUsername/:role`
- **描述**：移除某角色的配對
- **權限**：同上

---

### 3.6 閃耀計畫 (Shining Project)

#### `GET /api/shining/:username`
- **描述**：取得某學員的閃耀計畫資料
- **權限**：本人、負責的 `teacher`/`pastor`/`parent`(唯讀)、`admin`

#### `PUT /api/shining/:username/basic`
- **描述**：更新基本資料 (姓名/生日/教會/年級)
- **權限**：本人 (`student`)

#### `PUT /api/shining/:username/checklist`
- **描述**：更新信仰指標勾選
- **Request Body**：`{ category: string, key: string, value: boolean }`
- **權限**：本人 (`student`)

#### `PUT /api/shining/:username/lecture`
- **描述**：更新品格力/成年禮專題登記
- **Request Body**：`{ type: 'character' | 'comingOfAge', theme: string, speaker: string, date: string }`
- **權限**：`teacher`、`pastor`、`admin` (非學員填寫，由教師代為登記)

---

### 3.7 講師 (Lecturers)

#### `GET /api/lecturers`
- **描述**：取得所有講師清單
- **Query Parameters**：`church?: string`
- **權限**：已認證
- **教會隔離**：非 admin 角色只能查看與取得同教會的講師清單。

#### `POST /api/lecturers`
- **描述**：新增講師
- **Request Body**：`{ name: string, title: string, courseIds: string[], church: string }`
- **權限**：`teacher`、`pastor`、`admin`

#### `PUT /api/lecturers/:id`
- **描述**：更新講師資訊
- **權限**：`teacher`、`pastor`、`admin` (需同教會或 admin)

#### `DELETE /api/lecturers/:id`
- **描述**：刪除講師
- **權限**：`teacher`、`pastor`、`admin` (需同教會或 admin)

---

### 3.8 動態專題大綱 (Themes)

#### `GET /api/themes`
- **描述**：取得品格力與成年禮專題主題清單
- **Query Parameters**：`church?: string`
- **Response**：`{ characterThemes: string[], comingOfAgeThemes: string[] }`
- **權限**：已認證
- **教會隔離**：非 admin 角色僅能取得該所屬教會的清單。

#### `POST /api/themes`
- **描述**：新增主題
- **Request Body**：`{ type: 'character' | 'comingOfAge', name: string, church: string }`
- **權限**：`teacher`、`pastor`、`admin`

#### `PUT /api/themes`
- **描述**：重新命名主題
- **Request Body**：`{ type: 'character' | 'comingOfAge', oldName: string, newName: string, church: string }`
- **權限**：`teacher`、`pastor`、`admin`

#### `DELETE /api/themes`
- **描述**：刪除主題
- **Request Body**：`{ type: 'character' | 'comingOfAge', name: string, church: string }`
- **權限**：`teacher`、`pastor`、`admin`

---

### 3.9 統計 (Statistics)

#### `GET /api/stats/church-summaries`
- **描述**：取得所有教會的教師/學員數量統計
- **Response**：`[{ church: string, teacherCount: number, studentCount: number }]`
- **權限**：`admin`

#### `GET /api/stats/church/:church/lecturer-stats`
- **描述**：取得某教會中有幫 SS 講過課的講師與其講課次數
- **Response**：`[{ lecturerName: string, sessionCount: number }]`
- **權限**：`admin`、同教會 `pastor`

#### `GET /api/stats/teacher/:teacherUsername/managed-students`
- **描述**：取得某教師管理的 SS 學員列表
- **Response**：`string[]`
- **權限**：`admin`、同教會 `pastor`、`teacher` 本人

---

### 3.10 頁面限制 (Restrictions)

#### `GET /api/restrictions/:username`
- **描述**：取得使用者被限制的頁面列表
- **權限**：`admin`

#### `PUT /api/restrictions/:username`
- **描述**：設定頁面限制
- **Request Body**：`{ page: string }`
- **權限**：`admin`

---

## 4. 權限矩陣 (Permissions Matrix)

| 資源 / 操作 | student | teacher | parent | pastor | admin |
|---|---|---|---|---|---|
| **查看自己的課程進度** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **填寫聽課心得** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **填寫閃耀計畫 (自我檢視)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **查看同教會學員進度** | ❌ | ✅ | ❌ | ✅ | ✅(全部) |
| **查看自己綁定的學員進度** | ❌ | ❌ | ✅(唯讀) | ❌ | ❌ |
| **編輯學員專題課登記** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **回覆學員心得回饋** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **管理學員 (加入/取消管理)** | ❌ | ✅(同教會) | ❌ | ✅(同教會) | ✅ |
| **查看教會總覽統計** | ❌ | ❌ | ❌ | ✅ | ✅(全部) |
| **查看教師管理概況** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **查看講師授課統計** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **管理專題大綱/講師** | ❌ | ✅ | ❌ | ✅ | ✅ |
| **建立/刪除帳號** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **變更角色** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **設定頁面限制** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **跨教會查看資料** | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 5. 教會隔離邏輯 (Church Isolation)

### 核心原則

> **同教會原則 (Same-Church Principle)**：非 admin 角色只能查看和操作**與自己同教會**的成員資料。

### 前端篩選邏輯

前端目前使用 `authStore.usersDb` 搭配 `currentUser.church` 進行篩選：

```
教師 (teacher) 能看見的學員 =
  所有 usersDb 中 role === 'student' && church === currentUser.church 的帳號

牧者 (pastor) 能看見的學員/教師 =
  所有 usersDb 中 (role === 'student' || role === 'teacher') && church === currentUser.church 的帳號

家長 (parent) 能看見的學員 =
  usersDb 中 username 在 currentUser.childUsernames 列表中的學員 (家長註冊時或管理員配對時會強制篩選與同步為同教會學員)

Admin (admin) =
  無限制，可跨教會查看所有帳號
```

### 後端實作建議

1. **API 層面強制隔離**：在每個需要教會隔離的 API 端點中，後端應從 JWT/Session 中取得當前用戶的 `church`，並在 SQL/NoSQL 查詢中加入 `WHERE church = ?` 條件。
2. **不信任前端篩選**：前端的篩選僅為 UX 優化，後端必須獨立驗證。
3. **Admin 例外**：Admin 角色的請求不加教會條件。
4. **家長的特殊邏輯**：家長不是透過教會篩選，而是透過 `childUsernames` 綁定關係來決定可查看的學員。

### 資料一致性

- 當透過管理介面 (Admin) 或 API 為學員指派/變更家長 (parent) 時，應同步更新該家長帳號中的 `childUsernames` 列表。
- 當學員被刪除時，應同步清理：
  - 該學員在 `StudentCaretakers` 中的配對記錄
  - 家長帳號中 `childUsernames` 的引用
  - 該學員的 `ProgressRecord` 和 `ShiningProject` (可選擇保留或刪除)

---

## 6. 前端目前的 localStorage 資料結構

| localStorage Key | 資料模型 | 說明 |
|---|---|---|
| `superstart_user` | `User` | 當前登入用戶 |
| `superstart_users_db` | `Record<string, UserDbEntry>` | 所有帳號資料庫 |
| `superstart_progress_db` | `Record<string, Record<string, ProgressRecord>>` | 聽課進度 (username → courseId → record) |
| `superstart_restrictions_db` | `Record<string, string[]>` | 頁面限制 (username → restricted paths) |
| `superstart_student_teacher_db` | `Record<string, StudentCaretakers>` | 輔導配對 (studentUsername → caretakers) |
| `superstart_shining_project_db` | `Record<string, ShiningProject>` | 閃耀計畫 (username → project) |
| `superstart_character_themes_db` | `Record<string, string[]>` | 品格力動態主題清單庫 |
| `superstart_coming_of_age_themes_db` | `Record<string, string[]>` | 成年禮動態主題清單庫 |
| `superstart_lecturers_db` | `Lecturer[]` | 講師資料庫 (包含 church 欄位) |

### UserDbEntry 結構

```typescript
interface UserDbEntry {
  passwordHash: string
  role: 'student' | 'teacher' | 'parent' | 'pastor' | 'admin'
  church?: string           // 所屬教會 (admin 為 undefined)
  childUsernames?: string[] // 家長綁定的學員帳號列表
}
```

---

> ⚠️ **注意事項**：本文件描述的是目前前端 mock 資料層的邏輯。後端實作時應以此為邏輯基礎，但需加入：
> - 密碼 hash 加鹽 (bcrypt 等)
> - JWT/Session 認證機制
> - SQL/NoSQL 資料庫替代 localStorage
> - 輸入驗證與 SQL Injection 防護
> - Rate Limiting
> - CORS 設定
