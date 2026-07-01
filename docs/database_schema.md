# SSLecture 後端資料庫設計文件

> **文件版本**：v1.3.0  
> **最後更新**：2026-06-30  
> **資料來源**：分析前端 `src/stores/auth.ts`、`src/stores/courses.ts`、`src/stores/bookings.ts`、localStorage 資料結構  
> **建議資料庫**：PostgreSQL（主要）/ MySQL（可選）  
> **ORM 建議**：Prisma（Node.js）/ SQLAlchemy（Python）

---

## 目錄

1. [資料庫設計總覽（ER Diagram）](#1-資料庫設計總覽)
2. [資料表詳細設計](#2-資料表詳細設計)
   - [users（使用者）](#21-users-使用者)
   - [churches（教會）](#22-churches-教會)
   - [courses（課程）](#23-courses-課程)
   - [lecturers（講師）](#24-lecturers-講師)
   - [lecturer_courses（講師授課關聯）](#25-lecturer_courses-講師授課關聯)
   - [listen_sessions（聽課紀錄）](#26-listen_sessions-聽課紀錄)
   - [student_assignments（學員關懷配對）](#27-student_assignments-學員關懷配對)
   - [shining_projects（閃耀計畫）](#28-shining_projects-閃耀計畫)
   - [shining_faith_checklists（信仰指標勾選）](#29-shining_faith_checklists-信仰指標勾選)
   - [shining_lectures（專題課登記）](#210-shining_lectures-專題課登記)
   - [themes（動態專題大綱）](#211-themes-動態專題大綱)
   - [page_restrictions（頁面存取限制）](#212-page_restrictions-頁面存取限制)
   - [refresh_tokens（Token 管理）](#213-refresh_tokens-token-管理)
   - [teaching_stats（年度教學統計）](#214-teaching_stats-年度教學統計)
   - [booking_sessions（預約場次）](#215-booking_sessions-預約場次) ⭐ NEW
   - [booking_attendees（場次學員）](#216-booking_attendees-場次學員) ⭐ NEW
3. [索引設計](#3-索引設計)
4. [資料關聯圖（文字版）](#4-資料關聯圖文字版)
5. [設計決策與說明](#5-設計決策與說明)
6. [SQL 建表語句（PostgreSQL）](#6-sql-建表語句postgresql)
7. [種子資料（Seed Data）](#7-種子資料seed-data)

---

## 1. 資料庫設計總覽

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   churches  │────<│      users       │>────│ student_assign   │
└─────────────┘     └──────────────────┘     └──────────────────┘
                           │   │   │
              ┌────────────┘   │   └────────────────┐
              ▼               │                    ▼
┌──────────────────────┐      │     ┌──────────────────────────┐
│   listen_sessions    │      │     │    shining_projects       │
│  (多次聽課紀錄)       │      │     │    (閃耀計畫主表)          │
└──────────────────────┘      │     └──────────────────────────┘
         │                    │              │
         ▼                    ▼              ├──> shining_faith_checklists
  ┌─────────────┐   ┌────────────────────┐  └──> shining_lectures
  │   courses   │   │  booking_sessions  │ ⭐
  └─────────────┘   │  (預約場次)         │
         │          └────────────────────┘
         ▼                    │
  ┌────────────────────┐      ▼
  │  lecturer_courses  │────>┌──────────────────────┐
  └────────────────────┘    │  booking_attendees   │ ⭐
         │                  │  (學員出席與回饋)      │
         ▼                  └──────────────────────┘
  ┌──────────────┐
  │   lecturers  │
  └──────────────┘

其他獨立表：
  themes               (動態專題大綱清單)
  page_restrictions    (頁面存取限制)
  refresh_tokens       (JWT Refresh Token 黑名單)
  teaching_stats       (年度教學統計)
```

---

## 2. 資料表詳細設計

### 2.1 `users` 使用者

> **對應前端**：`auth.ts` → `usersDb`、`User` interface

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 系統唯一識別碼 |
| `username` | `VARCHAR(50)` | UNIQUE, NOT NULL | 登入帳號（英數字、底線） |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt 雜湊密碼 |
| `role` | `ENUM` | NOT NULL | `student` / `teacher` / `pastor` / `parent` / `admin` |
| `church_id` | `UUID` | FK → churches.id, NULL | 所屬教會（admin 為 NULL） |
| `display_name` | `VARCHAR(100)` | NULL | 暱稱（公開顯示） |
| `real_name` | `VARCHAR(100)` | NULL | 真實姓名（管理端顯示，不對學員公開） |
| `avatar_url` | `VARCHAR(512)` | NULL | 頭像圖片 URL |
| `login_method` | `ENUM` | NOT NULL, DEFAULT 'credentials' | `credentials` / `google` / `line` |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | 帳號是否啟用（FALSE = 軟刪除） |
| `last_login_at` | `TIMESTAMPTZ` | NULL | 最後登入時間 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

**設計說明**：
- `username` 唯一索引，用於登入
- `role` 決定整個系統的存取權限邏輯
- `admin` 角色的 `church_id` 為 NULL（跨教會管理）
- `real_name` 僅式於管理端（教師/牧者/管理員）顯示，不對學員公開
- `is_active = FALSE` 為軟刪除，歷史資料保留

---

### 2.2 `churches` 教會

> **對應前端**：`auth.ts` → `CHURCHES` 常數陣列（19 間教會）

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `name` | `VARCHAR(100)` | UNIQUE, NOT NULL | 教會名稱（如「愛與話語」） |
| `region` | `VARCHAR(100)` | NULL | 地區（如「台北」） |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | 是否啟用 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |

**內建資料（19 間）**：
`愛與話語`、`主大明`、`主勝利`、`主生命`、`主和睦光`、`台北主話語`、`聖靈`、`永明`、`主希望光`、`實踐`、`主愛`、`主大永`、`主磐石`、`信主`、`宜蘭主話語`、`天民`、`主幸福`、`信榮`、`主盼望`

---

### 2.3 `courses` 課程

> **對應前端**：`courses.ts` → `Course` interface、`rawCoursesList` 固定清單

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `VARCHAR(20)` | PK, NOT NULL | 格式：`bible-01`、`lecture-01` |
| `title` | `VARCHAR(100)` | NOT NULL | 課程名稱 |
| `category` | `ENUM` | NOT NULL | `bible`（聖經課程）/ `lecture`（專題講座） |
| `description` | `TEXT` | NULL | 課程說明 |
| `cover_color` | `VARCHAR(200)` | NULL | CSS 顏色或漸層字串 |
| `duration_seconds` | `INTEGER` | NOT NULL, DEFAULT 0 | 課程時長（秒） |
| `sort_order` | `INTEGER` | NOT NULL, DEFAULT 0 | 顯示排序 |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | 是否啟用 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |

**內建 30 堂課**：
- 聖經課程 15 堂（`bible-01` ～ `bible-15`）
- 專題講座 15 堂（`lecture-01` ～ `lecture-15`）

---

### 2.4 `lecturers` 講師

> **對應前端**：`courses.ts` → `Lecturer` interface、`lecturers` store

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `name` | `VARCHAR(100)` | NOT NULL | 講師顯示名稱 |
| `title` | `VARCHAR(30)` | NOT NULL | 職稱（牧師、傳道、長老、輔導、老師） |
| `church_id` | `UUID` | FK → churches.id, NULL | 所屬教會（NULL 表示跨教會） |
| `linked_user_id` | `UUID` | FK → users.id, NULL | 連結的教師帳號（NULL = 外來/自訂講師） |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | 是否啟用 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

**設計說明**：
- `linked_user_id` 是選填欄位：
  - 有值 → 講師為系統內教師帳號，可自動同步姓名與統計
  - NULL → 自訂講師或外來講員，僅儲存名稱字串
- 同一位教師帳號在同一教會應僅連結一筆講師記錄（建議應用端進行檢查）

---

### 2.5 `lecturer_courses` 講師授課關聯

> **對應前端**：`Lecturer.courseIds[]` — 一位講師可授多門課程（多對多）

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `lecturer_id` | `UUID` | FK → lecturers.id, NOT NULL | 講師 |
| `course_id` | `VARCHAR(20)` | FK → courses.id, NOT NULL | 課程 |

**複合主鍵**：`(lecturer_id, course_id)`

---

### 2.6 `listen_sessions` 聽課紀錄

> **對應前端**：`courses.ts` → `ListenSession` interface、`ProgressRecord.sessions[]`  
> **核心設計**：每次聽課新增一筆，不覆蓋；同一課程可有多筆（複習）

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `student_id` | `UUID` | FK → users.id, NOT NULL | 學員 |
| `course_id` | `VARCHAR(20)` | FK → courses.id, NOT NULL | 課程 |
| `lecturer_name` | `VARCHAR(80)` | NOT NULL | 授課講師名稱（自由文字，來自 lecturers.name + title） |
| `listened_at` | `TIMESTAMPTZ` | NOT NULL | 學員填報的聽課時間 |
| `notes` | `TEXT` | NULL | 學員心得（可為空） |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 系統建立時間（不可修改） |
| `updated_at` | `TIMESTAMPTZ` | NULL | 最後修改時間（NULL 表示從未修改） |

**業務邏輯**：
- 同一 `(student_id, course_id)` 可有多筆，不做 UNIQUE 限制
- 只要此學員此課程有任何一筆記錄，即視為「已完成」
- `lecturer_name` 儲存為自由文字（講師名+職稱），不做外鍵關聯，允許歷史紀錄保留即使講師被刪除

> **為何不用外鍵關聯 lecturer？**  
> 學員選擇的講師在填報當下已固定，若未來講師資料被修改或刪除，不應影響歷史紀錄。

---

### 2.7 `student_assignments` 學員關懷配對

> **對應前端**：`courses.ts` → `StudentCaretakers` interface、`studentTeacherDb`  
> 每位學員最多配對三種角色：teacher / pastor / parent

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `student_id` | `UUID` | UNIQUE, FK → users.id, NOT NULL | 學員（唯一，一位學員只有一筆配對記錄） |
| `teacher_id` | `UUID` | FK → users.id, NULL | 輔導教師（可為空） |
| `pastor_id` | `UUID` | FK → users.id, NULL | 分區牧者（可為空） |
| `parent_id` | `UUID` | FK → users.id, NULL | 關懷家長（可為空） |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

**設計說明**：
- `student_id` 加 UNIQUE，確保一位學員只有一筆配對記錄（UPSERT 操作）
- `teacher_id`、`pastor_id`、`parent_id` 皆可獨立為 NULL（未配對）
- 刪除配對時將對應欄位設為 NULL 即可

---

### 2.8 `shining_projects` 閃耀計畫

> **對應前端**：`courses.ts` → `ShiningProject` interface 的基本資料部分

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `student_id` | `UUID` | UNIQUE, FK → users.id, NOT NULL | 學員（一人一筆） |
| `name` | `VARCHAR(50)` | NULL | 真實姓名 |
| `birthday` | `DATE` | NULL | 生日 |
| `church_name` | `VARCHAR(100)` | NULL | 聚會教會（學員填報，可與 users.church_id 不同） |
| `school_grade` | `VARCHAR(50)` | NULL | 學校年級（如「師大附中 高一」） |
| `custom_challenge` | `TEXT` | NULL | 自訂進階挑戰文字 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

---

### 2.9 `shining_faith_checklists` 信仰指標勾選

> **對應前端**：`ShiningProject.faithPhase1`、`faithPhase2`、`advancedChallenges`  
> 共 3 個類別 × 5 個項目 = 最多 15 筆（每個 checkbox 一筆）

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `shining_project_id` | `UUID` | FK → shining_projects.id, NOT NULL | 所屬閃耀計畫 |
| `category` | `ENUM` | NOT NULL | `faith_phase1` / `faith_phase2` / `advanced_challenges` |
| `item_key` | `VARCHAR(50)` | NOT NULL | 項目 key（如 `worship`、`prayer`、`courses30`） |
| `is_checked` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | 是否勾選 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

**複合唯一鍵**：`(shining_project_id, category, item_key)`

**所有 item_key 清單**：

| category | item_key | 說明 |
|----------|----------|------|
| `faith_phase1` | `worship` | 每週持守主日禮拜 |
| `faith_phase1` | `prayer` | 每天禱告 10-15 分鐘 |
| `faith_phase1` | `independent` | 自主參與信仰 |
| `faith_phase1` | `reply` | 主動聯絡教師回覆訊息 |
| `faith_phase1` | `share` | 願意分享體會經歷 |
| `faith_phase2` | `courses30` | 聽完 30 個論（系統自動判斷） |
| `faith_phase2` | `prayer_long` | 每天禱告 20-30 分鐘 |
| `faith_phase2` | `morning_worship` | 晨禱 |
| `faith_phase2` | `read_bible` | 讀聖經 |
| `faith_phase2` | `church_service` | 教會服事 |
| `advanced_challenges` | `wednesday` | 週三聚會 |
| `advanced_challenges` | `share_faith` | 傳福音/分享信仰 |
| `advanced_challenges` | `copy_sermon` | 謄寫講道 |
| `advanced_challenges` | `morning_proverb` | 晨間箴言 |
| `advanced_challenges` | `custom` | 自訂挑戰（配合 custom_challenge 欄位） |

---

### 2.10 `shining_lectures` 專題課登記

> **對應前端**：`ShiningProject.characterLectures`、`ShiningProject.comingOfAgeTopics`  
> 學員每個專題主題只有一筆紀錄（講師 + 日期）

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `shining_project_id` | `UUID` | FK → shining_projects.id, NOT NULL | 所屬閃耀計畫 |
| `type` | `ENUM` | NOT NULL | `character`（品格力）/ `coming_of_age`（成年禮必修） |
| `theme_name` | `VARCHAR(100)` | NOT NULL | 主題名稱（來自 themes 表，但儲存文字以保留歷史） |
| `speaker_name` | `VARCHAR(80)` | NULL | 授課講師名稱（自由文字） |
| `lecture_date` | `DATE` | NULL | 上課日期 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

**複合唯一鍵**：`(shining_project_id, type, theme_name)`

---

### 2.11 `themes` 動態專題大綱

> **對應前端**：`courses.ts` → `characterThemesDb`、`comingOfAgeThemesDb`  
> 由各教會的教師/牧者動態管理，各教會獨立維護

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `church_id` | `UUID` | FK → churches.id, NOT NULL | 所屬教會 |
| `type` | `ENUM` | NOT NULL | `character`（品格力）/ `coming_of_age`（成年禮） |
| `name` | `VARCHAR(100)` | NOT NULL | 主題名稱（如「品格力 - 自律」） |
| `sort_order` | `INTEGER` | NOT NULL, DEFAULT 0 | 顯示排序 |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | 是否啟用 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |

**複合唯一鍵**：`(church_id, type, name)`

**內建種子資料**：
- `character`（品格力）：`品格力 - 自律`、`品格力 - 感謝`、`品格力 - 勇氣`、`品格力 - 正直`
- `coming_of_age`（成年禮）：`基督教歷史`、`台灣攝理歷史`、`情感教育`、`R的使命與精神`

---

### 2.12 `page_restrictions` 頁面存取限制

> **對應前端**：`courses.ts` → `PageRestrictionsDb`、`restrictionsDb`  
> 由管理員對特定帳號限制特定頁面的存取

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `user_id` | `UUID` | FK → users.id, NOT NULL | 被限制的使用者 |
| `page_path` | `VARCHAR(100)` | NOT NULL | 被限制的頁面路徑（如 `/shining`） |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |

**複合唯一鍵**：`(user_id, page_path)`

---

### 2.13 `refresh_tokens` JWT Token 管理

> **對應前端**：未來串接 JWT 認證時所需的 Refresh Token 儲存表

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 唯一識別碼 |
| `user_id` | `UUID` | FK → users.id, NOT NULL | 所屬使用者 |
| `token_hash` | `VARCHAR(255)` | UNIQUE, NOT NULL | Refresh Token 的 SHA256 雜湊值 |
| `expires_at` | `TIMESTAMPTZ` | NOT NULL | Token 過期時間 |
| `is_revoked` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | 是否已被撤銷（登出時設為 TRUE） |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |
| `last_used_at` | `TIMESTAMPTZ` | NULL | 最後使用時間 |

---

## 3. 索引設計

```sql
-- users 表
CREATE INDEX idx_users_username      ON users(username);
CREATE INDEX idx_users_church_role   ON users(church_id, role);
CREATE INDEX idx_users_role          ON users(role);

-- listen_sessions 表（最常被查詢的核心表）
CREATE INDEX idx_listen_sessions_student       ON listen_sessions(student_id);
CREATE INDEX idx_listen_sessions_course        ON listen_sessions(course_id);
CREATE INDEX idx_listen_sessions_student_course ON listen_sessions(student_id, course_id);
CREATE INDEX idx_listen_sessions_listened_at    ON listen_sessions(listened_at DESC);

-- student_assignments 表
CREATE INDEX idx_student_assignments_teacher ON student_assignments(teacher_id);
CREATE INDEX idx_student_assignments_pastor  ON student_assignments(pastor_id);
CREATE INDEX idx_student_assignments_parent  ON student_assignments(parent_id);

-- shining_faith_checklists 表
CREATE INDEX idx_faith_checklists_project ON shining_faith_checklists(shining_project_id);

-- shining_lectures 表
CREATE INDEX idx_shining_lectures_project ON shining_lectures(shining_project_id);

-- themes 表
CREATE INDEX idx_themes_church_type ON themes(church_id, type);

-- page_restrictions 表
CREATE INDEX idx_page_restrictions_user ON page_restrictions(user_id);

-- refresh_tokens 表
CREATE INDEX idx_refresh_tokens_user       ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- teaching_stats 表
CREATE INDEX idx_teaching_stats_year    ON teaching_stats(year);
CREATE INDEX idx_teaching_stats_teacher ON teaching_stats(teacher_id);

-- booking_sessions 表 ⭐
CREATE INDEX idx_booking_sessions_teacher  ON booking_sessions(teacher_id);
CREATE INDEX idx_booking_sessions_church   ON booking_sessions(church_id);
CREATE INDEX idx_booking_sessions_status   ON booking_sessions(status);
CREATE INDEX idx_booking_sessions_proposed ON booking_sessions(proposed_at DESC);

-- booking_attendees 表 ⭐
CREATE INDEX idx_booking_attendees_session ON booking_attendees(session_id);
CREATE INDEX idx_booking_attendees_student ON booking_attendees(student_id);
CREATE INDEX idx_booking_attendees_status  ON booking_attendees(attendance_status);
```

---

## 4. 資料關聯圖（文字版）

```
churches (1) ──────────────────────────── (N) users
    │                                           │
    │                                    ┌──────┴──────────┐
    │                                    │                  │
    (1)                               student          teacher/
    │                                   (1)           pastor/
    └──> (N) themes                     │            parent
    │                                   │               │
    (1)                    ┌────────────┼──────────┐    │
    │                      │            │          │    │
    └──> (N) lecturers     │            │          │    │
              │            ▼            ▼          ▼    ▼
              │     listen_sessions  shining_   student_ booking_
              │     (N 筆聽課)       projects   assign   sessions ⭐
              └──> (N) lecturer_         │                  │
                   courses           ┌──┴──┐          booking_
                       │             │     │          attendees ⭐
                       ▼           faith_ shining_       │
                   courses        checklists lectures     ├──> student
                                                         └──> listen_sessions
                                                              (選填連結)
```

---

## 5. 設計決策與說明

### 5.1 為何 `listen_sessions` 不加外鍵到 `lecturers`？

`listen_sessions.lecturer_name` 儲存為自由文字（如「張牧師 牧師」），而非 `lecturer_id` 外鍵。

**原因**：
- 學員填報的當下，講師名稱即已固定為歷史紀錄
- 若後續講師被刪除或修改，不應影響已有的聽課記錄
- 前端目前傳遞的是 `lec.name + ' ' + lec.title` 的組合字串

### 5.2 `shining_faith_checklists` 為何拆出獨立表？

前端原本是用 `faithPhase1: { worship: boolean, prayer: boolean, ... }` 的巢狀物件結構。

**拆出理由**：
- 避免 15 個布林欄位直接放在主表（擴展性差）
- 未來若需要新增信仰指標項目，只需新增資料列，不需要 ALTER TABLE
- 每個項目可記錄 `updated_at`，便於追蹤何時勾選

### 5.3 `shining_lectures` 的 `theme_name` 為何不用外鍵？

- 主題（themes）由管理員動態管理，可新增/刪除/改名
- 若用外鍵，刪除主題會連帶影響已登記的歷史紀錄
- 儲存文字確保資料的**歷史完整性**

### 5.4 `student_assignments` 為何用單一表而非關聯表？

- 一位學員固定只能有「一位」teacher、「一位」pastor、「一位」parent
- 用單一表 + 3 個 FK 欄位（可為 NULL）最直觀
- UPSERT（INSERT ON CONFLICT UPDATE）操作簡單

### 5.5 `courses30` 自動判斷邏輯

```sql
-- 後端應在查詢時自動計算，不完全依賴前端傳入
SELECT COUNT(DISTINCT course_id) AS completed_count
FROM listen_sessions
WHERE student_id = $1
-- 若 completed_count >= 30，則 courses30 = true
```

### 5.6 Booking System 的冠餘資料為何負載講師/課程名稱？

`booking_sessions` 表同時儲存 `lecturer_id`（FK）及 `lecturer_name`（文字）。

**原因**：
- 講師進行了安排後，若將來講師資料被刪除或改名，歷史預約紀錄仍需可讀
- `lecturer_id` 供系統查詢關聯用，設為 `ON DELETE SET NULL`
- `course_title` 同理：課程被冊除後預約紀錄仍需可讀

### 5.7 `booking_attendees` 的 `student_username` 為何冠餘儲存？

- 前端將 `username` 作為準 Session 和 Attendee 的 ID 組成核心，孶存後方便前端直接顯示而不需 JOIN
- 學員帳號一旦編輯（橪數少版本），需同步更新此冠餘欄位
- 建議後端建立 trigger `after_update_users` 同步更新 `booking_attendees.student_username`

---

## 6. SQL 建表語句（PostgreSQL）

```sql
-- ═══════════════════════════════════════════════════
--  啟用 UUID 擴展
-- ═══════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ═══════════════════════════════════════════════════
--  1. churches（教會）
-- ═══════════════════════════════════════════════════
CREATE TABLE churches (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       VARCHAR(100) NOT NULL UNIQUE,
  region     VARCHAR(100),
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
--  2. users（使用者）
-- ═══════════════════════════════════════════════════
CREATE TYPE user_role AS ENUM ('student', 'teacher', 'pastor', 'parent', 'admin');
CREATE TYPE login_method AS ENUM ('credentials', 'google', 'line');

CREATE TABLE users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  username      VARCHAR(50)  NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          user_role    NOT NULL,
  church_id     UUID         REFERENCES churches(id) ON DELETE SET NULL,
  display_name  VARCHAR(100),
  avatar_url    VARCHAR(512),
  login_method  login_method NOT NULL DEFAULT 'credentials',
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_username    ON users(username);
CREATE INDEX idx_users_church_role ON users(church_id, role);

-- ═══════════════════════════════════════════════════
--  3. courses（課程）
-- ═══════════════════════════════════════════════════
CREATE TYPE course_category AS ENUM ('bible', 'lecture');

CREATE TABLE courses (
  id               VARCHAR(20)     PRIMARY KEY,
  title            VARCHAR(100)    NOT NULL,
  category         course_category NOT NULL,
  description      TEXT,
  cover_color      VARCHAR(200),
  duration_seconds INTEGER         NOT NULL DEFAULT 0,
  sort_order       INTEGER         NOT NULL DEFAULT 0,
  is_active        BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
--  4. lecturers（講師）
-- ═══════════════════════════════════════════════════
CREATE TABLE lecturers (
  id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(100) NOT NULL,
  title           VARCHAR(30)  NOT NULL,
  church_id       UUID         REFERENCES churches(id) ON DELETE SET NULL,
  linked_user_id  UUID         REFERENCES users(id) ON DELETE SET NULL,  -- NULL = 外來/自訂講師
  is_active       BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_lecturers_church       ON lecturers(church_id);
CREATE INDEX idx_lecturers_linked_user  ON lecturers(linked_user_id);

-- ═══════════════════════════════════════════════════
--  5. lecturer_courses（講師授課關聯，多對多）
-- ═══════════════════════════════════════════════════
CREATE TABLE lecturer_courses (
  lecturer_id UUID        NOT NULL REFERENCES lecturers(id) ON DELETE CASCADE,
  course_id   VARCHAR(20) NOT NULL REFERENCES courses(id)   ON DELETE CASCADE,
  PRIMARY KEY (lecturer_id, course_id)
);

-- ═══════════════════════════════════════════════════
--  6. listen_sessions（聽課紀錄）
-- ═══════════════════════════════════════════════════
CREATE TABLE listen_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id     VARCHAR(20) NOT NULL REFERENCES courses(id),
  lecturer_name VARCHAR(80) NOT NULL,
  listened_at   TIMESTAMPTZ NOT NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ
);

CREATE INDEX idx_listen_sessions_student        ON listen_sessions(student_id);
CREATE INDEX idx_listen_sessions_student_course ON listen_sessions(student_id, course_id);
CREATE INDEX idx_listen_sessions_listened_at    ON listen_sessions(listened_at DESC);

-- ═══════════════════════════════════════════════════
--  7. student_assignments（學員關懷配對）
-- ═══════════════════════════════════════════════════
CREATE TABLE student_assignments (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  teacher_id UUID        REFERENCES users(id) ON DELETE SET NULL,
  pastor_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  parent_id  UUID        REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_student_assignments_teacher ON student_assignments(teacher_id);
CREATE INDEX idx_student_assignments_pastor  ON student_assignments(pastor_id);
CREATE INDEX idx_student_assignments_parent  ON student_assignments(parent_id);

-- ═══════════════════════════════════════════════════
--  8. shining_projects（閃耀計畫主表）
-- ═══════════════════════════════════════════════════
CREATE TABLE shining_projects (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id       UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(50),
  birthday         DATE,
  church_name      VARCHAR(100),
  school_grade     VARCHAR(50),
  custom_challenge TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════
--  9. shining_faith_checklists（信仰指標勾選）
-- ═══════════════════════════════════════════════════
CREATE TYPE checklist_category AS ENUM ('faith_phase1', 'faith_phase2', 'advanced_challenges');

CREATE TABLE shining_faith_checklists (
  id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
  shining_project_id  UUID               NOT NULL REFERENCES shining_projects(id) ON DELETE CASCADE,
  category            checklist_category NOT NULL,
  item_key            VARCHAR(50)        NOT NULL,
  is_checked          BOOLEAN            NOT NULL DEFAULT FALSE,
  updated_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
  UNIQUE (shining_project_id, category, item_key)
);

CREATE INDEX idx_faith_checklists_project ON shining_faith_checklists(shining_project_id);

-- ═══════════════════════════════════════════════════
--  10. shining_lectures（閃耀計畫專題課登記）
-- ═══════════════════════════════════════════════════
CREATE TYPE lecture_type AS ENUM ('character', 'coming_of_age');

CREATE TABLE shining_lectures (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  shining_project_id  UUID         NOT NULL REFERENCES shining_projects(id) ON DELETE CASCADE,
  type                lecture_type NOT NULL,
  theme_name          VARCHAR(100) NOT NULL,
  speaker_name        VARCHAR(80),
  lecture_date        DATE,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (shining_project_id, type, theme_name)
);

CREATE INDEX idx_shining_lectures_project ON shining_lectures(shining_project_id);

-- ═══════════════════════════════════════════════════
--  11. themes（動態專題大綱）
-- ═══════════════════════════════════════════════════
CREATE TYPE theme_type AS ENUM ('character', 'coming_of_age');

CREATE TABLE themes (
  id         UUID       PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id  UUID       NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
  type       theme_type NOT NULL,
  name       VARCHAR(100) NOT NULL,
  sort_order INTEGER      NOT NULL DEFAULT 0,
  is_active  BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (church_id, type, name)
);

CREATE INDEX idx_themes_church_type ON themes(church_id, type);

-- ═══════════════════════════════════════════════════
--  12. page_restrictions（頁面存取限制）
-- ═══════════════════════════════════════════════════
CREATE TABLE page_restrictions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  page_path  VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, page_path)
);

CREATE INDEX idx_page_restrictions_user ON page_restrictions(user_id);

-- ═══════════════════════════════════════════════════
--  13. refresh_tokens（JWT Token 管理）
-- ═══════════════════════════════════════════════════
CREATE TABLE refresh_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   VARCHAR(255) NOT NULL UNIQUE,
  expires_at   TIMESTAMPTZ NOT NULL,
  is_revoked   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE INDEX idx_refresh_tokens_user       ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
```

---

## 7. 種子資料（Seed Data）

```sql
-- ────────────────────────────────────────────────
--  種子教會（19 間）
-- ────────────────────────────────────────────────
INSERT INTO churches (name) VALUES
  ('愛與話語'), ('主大明'), ('主勝利'), ('主生命'), ('主和睦光'),
  ('台北主話語'), ('聖靈'), ('永明'), ('主希望光'), ('實踐'),
  ('主愛'), ('主大永'), ('主磐石'), ('信主'), ('宜蘭主話語'),
  ('天民'), ('主幸福'), ('信榮'), ('主盼望');

-- ────────────────────────────────────────────────
--  種子課程（30 堂）
-- ────────────────────────────────────────────────
INSERT INTO courses (id, title, category, duration_seconds, sort_order) VALUES
  ('bible-01',   '聖經時觀',               'bible',   180, 1),
  ('bible-02',   '日月停止',               'bible',   240, 2),
  ('bible-03',   '彼得與釣魚',             'bible',   200, 3),
  ('bible-04',   '以利亞與烏鴉飯',         'bible',   300, 4),
  ('bible-05',   '三分說',                 'bible',   220, 5),
  ('bible-06',   '七階段法則',             'bible',   180, 6),
  ('bible-07',   '火之概念',               'bible',   240, 7),
  ('bible-08',   '末世論',                 'bible',   200, 8),
  ('bible-09',   '比喻論',                 'bible',   300, 9),
  ('bible-10',   '洪水審判',               'bible',   220, 10),
  ('bible-11',   '無知中的相剋世界',       'bible',   180, 11),
  ('bible-12',   '預定論',                 'bible',   240, 12),
  ('bible-13',   '異端的概念',             'bible',   200, 13),
  ('bible-14',   '中心人物論',             'bible',   300, 14),
  ('bible-15',   '復活論',                 'bible',   220, 15),
  ('lecture-01', '三位一體',               'lecture', 180, 16),
  ('lecture-02', '聖子論',                 'lecture', 240, 17),
  ('lecture-03', '再臨論',                 'lecture', 200, 18),
  ('lecture-04', '空提論',                 'lecture', 300, 19),
  ('lecture-05', '啟示論',                 'lecture', 220, 20),
  ('lecture-06', '靈界論',                 'lecture', 180, 21),
  ('lecture-07', '撒旦論',                 'lecture', 240, 22),
  ('lecture-08', '該隱的個性',             'lecture', 200, 23),
  ('lecture-09', '罪與悔改',               'lecture', 300, 24),
  ('lecture-10', '創造目的',               'lecture', 220, 25),
  ('lecture-11', '墮落論',                 'lecture', 180, 26),
  ('lecture-12', '施洗約翰與耶穌的關係使命', 'lecture', 240, 27),
  ('lecture-13', '兩棵橄欖樹與兩個見證人', 'lecture', 200, 28),
  ('lecture-14', '歷史論',                 'lecture', 300, 29),
  ('lecture-15', '一載二載半載',           'lecture', 220, 30);

-- ────────────────────────────────────────────────
--  種子主題（以愛與話語教會為例）
-- ────────────────────────────────────────────────
INSERT INTO themes (church_id, type, name, sort_order)
SELECT id, 'character', unnest(ARRAY[
  '品格力 - 自律', '品格力 - 感謝', '品格力 - 勇氣', '品格力 - 正直'
]), generate_series(1, 4)
FROM churches WHERE name = '愛與話語';

INSERT INTO themes (church_id, type, name, sort_order)
SELECT id, 'coming_of_age', unnest(ARRAY[
  '基督教歷史', '台灣攝理歷史', '情感教育', 'R的使命與精神'
]), generate_series(1, 4)
FROM churches WHERE name = '愛與話語';

-- ────────────────────────────────────────────────
--  種子測試帳號（密碼請使用 bcrypt 雜湊後填入）
-- ────────────────────────────────────────────────
-- 以下 password_hash 為 '123456' 的 bcrypt 雜湊（範例，實際請重新生成）
-- $2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYpR8HRuHQOBDGS

INSERT INTO users (username, password_hash, role, church_id, display_name) VALUES
  ('student', '$2b$12$...', 'student', (SELECT id FROM churches WHERE name='愛與話語'), 'SS學員'),
  ('teacher', '$2b$12$...', 'teacher', (SELECT id FROM churches WHERE name='愛與話語'), '輔導教師'),
  ('pastor',  '$2b$12$...', 'pastor',  (SELECT id FROM churches WHERE name='愛與話語'), '分區牧者'),
  ('parent',  '$2b$12$...', 'parent',  (SELECT id FROM churches WHERE name='愛與話語'), '關懷家長'),
  ('admin',   '$2b$12$...', 'admin',   NULL,                                            'SS中央管理員');
```

---

*本文件由前端分析自動生成，後端工程師可直接參考此 SQL 進行資料庫建置。如有結構調整需求，請同步更新 `backend_api_spec.md` 文件。*

---

### 2.14 `teaching_stats` 年度教學統計

> **對應前端**：`courses.ts` → `TeachingStats` interface，`superstart_teaching_stats_db` localStorage key

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `UUID` | PK, NOT NULL | 系統唯一識別碼 |
| `teacher_id` | `UUID` | FK → users.id, NOT NULL | 教師帳號（role = teacher） |
| `year` | `SMALLINT` | NOT NULL, CHECK >= 2020 | 統計年度（如 2025） |
| `one_on_one_30` | `INTEGER` | NOT NULL, DEFAULT 0, CHECK >= 0 | 1對1 講「三十個論」人次 |
| `one_to_many_30` | `INTEGER` | NOT NULL, DEFAULT 0, CHECK >= 0 | 1對多 講「三十個論」人次 |
| `one_on_one_shining` | `INTEGER` | NOT NULL, DEFAULT 0, CHECK >= 0 | 1對1 講「閃耀計畫課程」人次 |
| `one_to_many_shining` | `INTEGER` | NOT NULL, DEFAULT 0, CHECK >= 0 | 1對多 講「閃耀計畫課程」人次 |
| `submitted_at` | `TIMESTAMPTZ` | NULL | 最後申報/更新時間 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

**設計說明**：
- `(teacher_id, year)` 為複合唯一鍵，保證每位教師每年度僅一筆紀錄
- 人次對應前端計算規則：一次對多人講義以「人次」計（如一次對3人 = 3人次）
- 可由後端提供查詢橫醵：`GROUP BY year` 提供跨教會年度比較

**SQL DDL**：
```sql
CREATE TABLE teaching_stats (
  id                    UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year                  SMALLINT     NOT NULL CHECK (year >= 2020),
  one_on_one_30         INTEGER      NOT NULL DEFAULT 0 CHECK (one_on_one_30 >= 0),
  one_to_many_30        INTEGER      NOT NULL DEFAULT 0 CHECK (one_to_many_30 >= 0),
  one_on_one_shining    INTEGER      NOT NULL DEFAULT 0 CHECK (one_on_one_shining >= 0),
  one_to_many_shining   INTEGER      NOT NULL DEFAULT 0 CHECK (one_to_many_shining >= 0),
  submitted_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_teaching_stats_teacher_year UNIQUE (teacher_id, year)
);

CREATE INDEX idx_teaching_stats_year ON teaching_stats(year);
CREATE INDEX idx_teaching_stats_teacher ON teaching_stats(teacher_id);
```

---

### 2.15 `booking_sessions` 預約場次 ⭐

> **對應前端**：`bookings.ts` → `BookingSession` interface，`superstart_booking_sessions_db` localStorage key  
> **新增於**：v1.3.0（2026-06-30）

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `VARCHAR(64)` | PK, NOT NULL | 前端格式：`sess_${Date.now()}` |
| `teacher_id` | `UUID` | FK → users.id, NOT NULL | 建立預約的教師 |
| `church_id` | `UUID` | FK → churches.id, NULL | 場次所屬教會 |
| `course_id` | `VARCHAR(64)` | FK → courses.id, NULL | 對應課程 |
| `course_title` | `VARCHAR(200)` | NOT NULL | 課程名稱（冗餘儲存，保留歷史） |
| `lecturer_id` | `VARCHAR(64)` | FK → lecturers.id, NULL | 對應講師 |
| `lecturer_name` | `VARCHAR(100)` | NOT NULL | 講師姓名（冗餘儲存） |
| `lecturer_title` | `VARCHAR(50)` | NOT NULL, DEFAULT '' | 講師稱謂（如「牧師」） |
| `proposed_at` | `TIMESTAMPTZ` | NOT NULL | 教師提議的時間 |
| `confirmed_at` | `TIMESTAMPTZ` | NULL | 最終確認的時間（雙方同意後填入） |
| `duration_minutes` | `SMALLINT` | NULL, CHECK >= 1 | 預計課程時長（分鐘） |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'pending' | `pending / confirmed / completed / cancelled` |
| `cancel_reason` | `TEXT` | NULL | 取消原因（status = cancelled 時填入） |
| `teacher_session_notes` | `TEXT` | NULL | 教師整場備注（完成後填寫） |
| `is_group_session` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | 是否為團體聽課 |
| `prep_scriptures` | `TEXT[]` | NOT NULL, DEFAULT '{}' | 預習經文列表（PostgreSQL 陣列） |
| `prep_reading_notes` | `TEXT` | NULL | 預習說明 |
| `prep_materials` | `TEXT` | NULL | 補充材料說明 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

**狀態機**：
```
pending ──confirm──> confirmed ──complete──> completed
  │                      │
  └──cancel──────────────┴──cancel──> cancelled
```

**設計說明**：
- `course_title`、`lecturer_name`、`lecturer_title` 冗餘儲存，避免講師/課程被刪除後歷史資料遺失
- `prep_scriptures` 使用 PostgreSQL 原生陣列型別；MySQL 替代方案可改用 JSON 欄位
- 建議後端在 `status = completed` 時自動 trigger 同步至 `listen_sessions`（若需要）

**SQL DDL**：
```sql
CREATE TABLE booking_sessions (
  id                    VARCHAR(64)  PRIMARY KEY,
  teacher_id            UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  church_id             UUID         REFERENCES churches(id) ON DELETE SET NULL,
  course_id             VARCHAR(64)  REFERENCES courses(id) ON DELETE SET NULL,
  course_title          VARCHAR(200) NOT NULL,
  lecturer_id           VARCHAR(64)  REFERENCES lecturers(id) ON DELETE SET NULL,
  lecturer_name         VARCHAR(100) NOT NULL,
  lecturer_title        VARCHAR(50)  NOT NULL DEFAULT '',
  proposed_at           TIMESTAMPTZ  NOT NULL,
  confirmed_at          TIMESTAMPTZ,
  duration_minutes      SMALLINT     CHECK (duration_minutes >= 1),
  status                VARCHAR(20)  NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','completed','cancelled')),
  cancel_reason         TEXT,
  teacher_session_notes TEXT,
  is_group_session      BOOLEAN      NOT NULL DEFAULT FALSE,
  prep_scriptures       TEXT[]       NOT NULL DEFAULT '{}',
  prep_reading_notes    TEXT,
  prep_materials        TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_booking_sessions_teacher  ON booking_sessions(teacher_id);
CREATE INDEX idx_booking_sessions_church   ON booking_sessions(church_id);
CREATE INDEX idx_booking_sessions_status   ON booking_sessions(status);
CREATE INDEX idx_booking_sessions_proposed ON booking_sessions(proposed_at DESC);
```

---

### 2.16 `booking_attendees` 場次學員 ⭐

> **對應前端**：`bookings.ts` → `BookingAttendee` interface，`superstart_booking_attendees_db` localStorage key  
> **新增於**：v1.3.0（2026-06-30）

| 欄位名 | 資料型別 | 限制 | 說明 |
|--------|----------|------|------|
| `id` | `VARCHAR(128)` | PK, NOT NULL | 前端格式：`att_${sessionId}_${studentUsername}` |
| `session_id` | `VARCHAR(64)` | FK → booking_sessions.id, NOT NULL | 所屬預約場次 |
| `student_id` | `UUID` | FK → users.id, NOT NULL | 受邀學員 |
| `student_username` | `VARCHAR(50)` | NOT NULL | 學員帳號（冗餘儲存，方便查詢） |
| `attendance_status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'invited' | `invited / attended / absent` |
| `student_feedback` | `TEXT` | NULL | 學員課後心得（由學員自行填寫） |
| `teacher_feedback` | `TEXT` | NULL | 教師對該學員的個別回饋 |
| `feedback_at` | `TIMESTAMPTZ` | NULL | 回饋最後更新時間 |
| `linked_listen_session_id` | `VARCHAR(64)` | FK → listen_sessions.id, NULL | 手動連結至聽課進度紀錄 |
| `created_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 建立時間 |
| `updated_at` | `TIMESTAMPTZ` | NOT NULL, DEFAULT NOW() | 最後更新時間 |

**設計說明**：
- `(session_id, student_id)` 為複合唯一鍵，確保同一場次同一學員只有一筆
- `attendance_status` 由教師在場次完成後填寫，預設 `invited`
- `student_feedback` 由學員自行從學員端填寫
- `linked_listen_session_id` 為選填，允許手動關聯到已存在的 `listen_sessions` 紀錄
- `student_username` 冗餘儲存方便前端直接顯示，避免 JOIN 查詢

**SQL DDL**：
```sql
CREATE TABLE booking_attendees (
  id                       VARCHAR(128) PRIMARY KEY,
  session_id               VARCHAR(64)  NOT NULL REFERENCES booking_sessions(id) ON DELETE CASCADE,
  student_id               UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_username         VARCHAR(50)  NOT NULL,
  attendance_status        VARCHAR(20)  NOT NULL DEFAULT 'invited'
                             CHECK (attendance_status IN ('invited','attended','absent')),
  student_feedback         TEXT,
  teacher_feedback         TEXT,
  feedback_at              TIMESTAMPTZ,
  linked_listen_session_id VARCHAR(64)  REFERENCES listen_sessions(id) ON DELETE SET NULL,
  created_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_booking_attendees_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX idx_booking_attendees_session ON booking_attendees(session_id);
CREATE INDEX idx_booking_attendees_student ON booking_attendees(student_id);
CREATE INDEX idx_booking_attendees_status  ON booking_attendees(attendance_status);
```

---

*本文件由前端分析自動生成，後端工程師可直接參考此 SQL 進行資料庫建置。如有結構調整需求，請同步更新 `backend_api_spec.md` 文件。*
