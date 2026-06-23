# SSLecture 後端 API 規格文件

> **文件版本**：v1.2.0  
> **最後更新**：2026-06-24  
> **前端版本**：Vue 3 + TypeScript（目前以 localStorage 模擬，待串接）  
> **目標後端技術**：RESTful API（Node.js / Python / 任意語言均可）

---

## 目錄

1. [通用規範](#1-通用規範)
2. [認證 Auth](#2-認證-auth)
3. [課程 Courses](#3-課程-courses)
4. [聽課紀錄 Listen Sessions](#4-聽課紀錄-listen-sessions)
5. [講師管理 Lecturers](#5-講師管理-lecturers)
6. [學員關懷配對 Assignments](#6-學員關懷配對-assignments)
7. [閃耀計畫 Shining Project](#7-閃耀計畫-shining-project)
8. [管理員 Admin](#8-管理員-admin)
9. [年度教學統計 Teaching Stats](#9-年度教學統計-teaching-stats)
10. [資料模型定義](#10-資料模型定義)
11. [錯誤碼一覽](#11-錯誤碼一覽)
12. [前端串接遷移指南](#12-前端串接遷移指南)

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
  "username": "student01",
  "password": "123456"
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
      "avatarUrl": "https://..."
    }
  }
}
```

**錯誤**：
- `401 INVALID_CREDENTIALS`：帳號或密碼錯誤
- `403 ACCOUNT_DISABLED`：帳號被停用

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
    "avatarUrl": "https://...",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

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
      { "id": "l1", "name": "張牧師", "title": "牧師" }
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
- `teacher` / `pastor` / `parent`：只能查詢其管理的學員
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
        "title": "牧師",
        "church": "愛與話語",
        "courseIds": ["bible-01", "bible-02"]
      }
    ]
  }
}
```

---

### `POST /lecturers`
**說明**：新增講師

**權限**：`admin`

**Request Body**：
```json
{
  "name": "林長老",
  "title": "長老",
  "church": "愛與話語",
  "courseIds": ["lecture-01", "lecture-02"]
}
```

---

### `PUT /lecturers/:lecturerId`
**說明**：完整更新講師資料

**權限**：`admin`

**Request Body**：同 POST

---

### `DELETE /lecturers/:lecturerId`
**說明**：刪除講師

**權限**：`admin`

---

## 6. 學員關懷配對 Assignments

> 每位學員可配對三種關懷角色：
> - `teacher`：輔導教師
> - `pastor`：分區牧者  
> - `parent`：關懷家長

### `GET /assignments/:studentUsername`
**說明**：取得某學員的關懷人員配對資料

**權限**：
- `student`：只能查詢自己
- `teacher` / `pastor` / `parent`：只能查詢其管理的學員
- `admin`：可查詢任何人

**Response**：
```json
{
  "success": true,
  "data": {
    "studentUsername": "student01",
    "teacher": "teacher01",
    "pastor": "pastor01",
    "parent": "parent01"
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
  "pastor": "pastor01",
  "parent": "parent01"
}
```

---

### `DELETE /assignments/:studentUsername/:role`
**說明**：移除某角色的配對

**權限**：同 PUT

**Path Params**：`role` = `teacher` | `pastor` | `parent`

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

> ⚠️ **注意**：`faithPhase2.courses30` 若後端計算學員已完成 30 門課，應自動設為 `true`，不受前端傳入值影響。

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
  "password": "初始密碼",
  "role": "student",
  "church": "愛與話語",
  "displayName": "李小華"
}
```

---

### `PUT /admin/users/:username`
**說明**：更新使用者資料（包含重設密碼、更改角色）

**權限**：`admin`

**Request Body**（欄位均選填）：
```json
{
  "displayName": "新名稱",
  "role": "teacher",
  "church": "愛與話語",
  "password": "新密碼（選填）"
}
```

---

### `DELETE /admin/users/:username`
**說明**：停用使用者帳號（軟刪除，`isActive = false`）

**權限**：`admin`

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

## 10. 資料模型定義

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
| `name` | string | 姓名 |
| `title` | string | 職稱（牧師/傳道/長老/輔導等） |
| `church` | string | 所屬教會 |
| `courseIds` | string[] | 可授課的課程 ID 清單（用於篩選建議講師） |

### StudentAssignment（關懷配對）
| 欄位 | 型別 | 說明 |
|------|------|------|
| `studentUsername` | string | 學員帳號（FK） |
| `teacher` | string? | 輔導教師帳號（FK） |
| `pastor` | string? | 分區牧者帳號（FK） |
| `parent` | string? | 關懷家長帳號（FK） |
| `updatedAt` | ISO8601 | 最後更新時間 |

---

## 11. 錯誤碼一覽

| HTTP 狀態碼 | 錯誤碼 | 中文說明 |
|-------------|--------|---------|
| 400 | `VALIDATION_ERROR` | 請求參數格式錯誤或驗證失敗 |
| 400 | `INVALID_DATE_FORMAT` | 日期時間格式不正確 |
| 401 | `UNAUTHORIZED` | 未提供 Token 或 Token 無效 |
| 401 | `INVALID_CREDENTIALS` | 帳號或密碼錯誤 |
| 401 | `TOKEN_EXPIRED` | Access Token 已過期，請呼叫 /auth/refresh |
| 401 | `REFRESH_TOKEN_EXPIRED` | Refresh Token 已過期，需重新登入 |
| 403 | `FORBIDDEN` | 有登入但無權限執行此操作 |
| 403 | `ACCOUNT_DISABLED` | 帳號已被停用（isActive = false） |
| 404 | `USER_NOT_FOUND` | 找不到此使用者 |
| 404 | `COURSE_NOT_FOUND` | 找不到此課程 |
| 404 | `SESSION_NOT_FOUND` | 找不到此聽課紀錄 |
| 404 | `LECTURER_NOT_FOUND` | 找不到此講師 |
| 404 | `STATS_NOT_FOUND` | 找不到此年度教學統計 |
| 409 | `USERNAME_TAKEN` | 帳號名稱已被使用 |
| 500 | `INTERNAL_ERROR` | 伺服器內部錯誤 |

---

## 12. 前端串接遷移指南

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

### 建議前端修改步驟

1. **安裝 axios**：`npm install axios`
2. **建立 `src/api/client.ts`**：封裝 axios instance，設定 Base URL 與 Token 攔截器
3. **逐步替換各 Store**：將 `localStorage.getItem / setItem` 改為 `await api.get/post` 呼叫
4. **錯誤處理**：在 axios response 攔截器統一處理 401/403 錯誤，顯示提示訊息

---

*本文件由前端團隊維護。如後端有欄位或邏輯調整，請同步更新此文件並通知前後端雙方確認後再上線。*
