# SSLecture 後端第一階段工作計畫

> **文件版本**：v1.2.0  
> **最後更新**：2026-11-26  
> **資料庫**：MySQL 8.4 LTS（建表 SQL 見[資料庫設計第 6 節](./database_schema.md#6-sql-建表語句mysql)）  
> **後端**：[`SSLecture_backend`](https://github.com/jaras0209/SSLecture_backend)（Java 25、Spring Boot 4、Liquibase）；本 repository 只有前端與文件  
> **相關文件**：[文件導覽](./README.md)・[API 規格](./backend_api_spec.md)・[資料庫設計](./database_schema.md)・[社群登入](./oauth2_social_login_spec.md)・[待辦清單](../TODO.md)

第一階段的目標：**教會能以帳號密碼登入，完成最常用的流程**（帳號與邀請碼、關懷配對、聽課紀錄、心得回覆），
並以真實資料試辦。閃耀計畫、預約、教學統計、社群登入放到第二階段，前端在那之前繼續使用瀏覽器裡的資料。

---

## 目錄

1. [已決定的事](#1-已決定的事)
2. [第一階段的步驟](#2-第一階段的步驟)（含[目前進度](#目前進度)）
3. [第二階段](#3-第二階段)
4. [還沒決定的事](#4-還沒決定的事)

附錄：[版本紀錄](#版本紀錄)

---

## 1. 已決定的事

| 項目 | 決定 | 說明 |
|------|------|------|
| 資料庫 | MySQL 8.4 LTS | 教會使用 MySQL。字元集、定序、連線時區等設定見資料庫設計第 6 節 |
| 後端位置 | [`SSLecture_backend`](https://github.com/jaras0209/SSLecture_backend) | 前端以 `VITE_API_BASE_URL` 連到後端（見根目錄 [`README.md`](../README.md)） |
| 結構管理 | Liquibase | 後端已採用；changelog 與資料庫設計第 6、7 節的 SQL 相同 |
| 社群登入（Google / LINE） | 第二階段 | 第一階段只用帳號密碼；需要 Redis 與第三方平台設定，見 [`oauth2_social_login_spec.md`](./oauth2_social_login_spec.md) |
| 示範站的資料 | 試辦時用前端備份檔匯入 | 管理員在前端「資料備份」匯出 JSON，依[資料庫設計第 9 節](./database_schema.md#9-從前端備份搬移資料)一次匯入 |

---

## 2. 第一階段的步驟

每一步都包含：資料表（已在資料庫設計第 6 節）、API、後端測試（以真實的 MySQL 執行，不用記憶體資料庫，
`CHECK` 與唯一限制才測得到），以及前端改接（API 規格[第 13 節](./backend_api_spec.md#13-前端串接遷移指南)的對照表）。
完成一步再做下一步，前端可以一步一步切換。

### 目前進度

2026-11-26 對照後端 repository 整理：

| 步驟 | 後端 | 前端改接 |
|------|------|----------|
| 0 專案骨架 | 完成。資料庫由 PostgreSQL ＋ H2 改為 MySQL 8.4 的變更已完成並通過測試，待推送到後端 repository | — |
| 1 登入與帳號 | 大致完成：登入、註冊、換發 Token、登出、重設密碼、`GET` / `PATCH /auth/me`、嘗試次數限制、記住我、`token_version` | 尚未開始 |
| 2–5 | 尚未開始 | 尚未開始 |

### 步驟 0：專案骨架

- Spring Boot 專案：Spring Web、Spring Security、Spring Data JPA、Liquibase、MySQL 驅動
- Liquibase 的 changelog 與資料庫設計第 6 節、[7.1 正式資料](./database_schema.md#71-正式資料)相同；
  [7.3 示範帳號](./database_schema.md#73-示範帳號只在開發與測試環境)以 `context:dev,test` 只在開發與測試執行。
  這些 SQL 都由前端的 CI 以 MySQL 8.4 檢查過
- 共用的部分：回應格式與錯誤碼（API 規格[第 1 節](./backend_api_spec.md#1-通用規範)、[第 12 節](./backend_api_spec.md#12-錯誤碼一覽)）、
  [欄位長度上限](./backend_api_spec.md#欄位長度上限)的檢查、[跨網域（CORS）](./backend_api_spec.md#跨網域cors)、時間格式（資料庫 5.14）
- 測試環境：以 Testcontainers 或 CI 的 MySQL 8.4 服務跑整合測試（後端的 `.github/workflows/ci.yml`）

### 步驟 1：登入與帳號

- [`POST /auth/login`](./backend_api_spec.md#post-authlogin)、`/auth/refresh`、`/auth/logout`、`GET` / `PATCH /auth/me`、
  [`POST /auth/register`](./backend_api_spec.md#post-authregister)、`/auth/reset-password`
- 密碼以 bcrypt 雜湊；[密碼規則](./backend_api_spec.md#密碼規則)；管理員設定的密碼須先更換（`must_change_password`）
- [嘗試次數限制](./backend_api_spec.md#嘗試次數限制)（`auth_attempts`）、[記住我與閒置登出](./backend_api_spec.md#記住我與閒置登出)、
  帳號變更時以 `token_version` 結束既有的登入（資料庫 5.15）
- 前端：`authStore.login()` 等改呼叫 API，移除瀏覽器裡的密碼

### 步驟 2：管理員與邀請碼

- [第 8 節〈管理員〉](./backend_api_spec.md#8-管理員-admin)的帳號管理（建立、改角色、停用、重設密碼）與邀請碼
- 刪除帳號或改角色時的清理（資料庫 5.12），帳號名稱不可重新使用
- 頁面存取限制（`/admin/page-restrictions`）放到第二階段

### 步驟 3：性別、關懷配對與家長綁定

- [第 6 節〈學員關懷配對〉](./backend_api_spec.md#6-學員關懷配對-assignments)、[家長綁定](./backend_api_spec.md#家長綁定-parent-bindings)、
  [性別](./backend_api_spec.md#性別-gender)
- **[可見範圍規則](./backend_api_spec.md#可見範圍規則誰看得到誰)集中寫在一處**（對應前端 `src/utils/scope.ts`），
  之後每個學員相關的 API 都用它；這一步先寫好並完整測試，後面的步驟才不會各自實作

### 步驟 4：課程、講師與聽課紀錄

- [第 3 節〈課程〉](./backend_api_spec.md#3-課程-courses)、[第 5 節〈講師管理〉](./backend_api_spec.md#5-講師管理-lecturers)、
  [第 4 節〈聽課紀錄〉](./backend_api_spec.md#4-聽課紀錄-listen-sessions)
- 講師不重複（`409 LECTURER_EXISTS` / `LECTURER_ACCOUNT_LINKED`）；聽課時間不可是未來（資料庫 5.17）

### 步驟 5：心得回覆

- `GET` / `POST /progress/:username/:courseId/feedback`、新回覆提醒（`feedback/unread`、`feedback/seen`）

### 步驟 6：試辦

- 前端以 `VITE_API_BASE_URL` 指向後端、`VITE_DEMO_MODE=false` 重新建置（根目錄 README〈環境變數〉）
- 匯入示範站的資料：管理員匯出備份檔，以 `scripts/backup-to-sql.py` 轉成 SQL 後匯入（資料庫設計第 9 節）。
  工具會先列出不符合資料庫規則的資料，請在前端修正後重新匯出；密碼雜湊後每個人第一次登入時須更換，匯入後刪除備份檔與 SQL 檔
- 不匯入時，改以[資料庫設計 7.2](./database_schema.md#72-第一個管理員) 建立第一個管理員
- 第二階段的功能在試辦期間仍存在瀏覽器裡，正式切換前再匯入一次

---

## 3. 第二階段

| 項目 | API 規格 | 備註 |
|------|----------|------|
| 閃耀計畫與專題主題 | [第 7 節](./backend_api_spec.md#7-閃耀計畫-shining-project) | 主題改名時同步學員的紀錄（資料庫 5.3） |
| 聽課預約 | [第 10 節](./backend_api_spec.md#10-聽課預約-booking-system) | 預約的時間規則、講師看得到自己授課的全部學員 |
| 年度教學統計、頁面存取限制 | [第 9 節](./backend_api_spec.md#9-年度教學統計-teaching-stats)、第 8 節 | |
| 社群登入（Google / LINE） | [`oauth2_social_login_spec.md`](./oauth2_social_login_spec.md) | 需要 Redis；先完成該文件第 9 章的平台設定 |
| 信箱驗證、寄信重設密碼 | [帳號與信箱（規劃）](./backend_api_spec.md#帳號與信箱規劃) | 需要寄信服務 |

---

## 4. 還沒決定的事

- **部署位置**：後端與 MySQL 放在雲端服務或教會自己的主機。決定後補上：備份方式（每日備份、保留多久、還原演練）、
  HTTPS 憑證、誰負責維運
- 前端是否繼續放在 GitHub Pages：若改由自己的伺服器提供，須加上 CSP 回應標頭（根目錄 README〈安全性標頭與跨網域〉）

---

## 版本紀錄

### v1.2.0（2026-11-26）對照後端進度

- 新增〈目前進度〉：步驟 0 完成、步驟 1 的後端大致完成
- 後端位置、技術改為實際的 `SSLecture_backend`（Spring Boot 4、Liquibase）；Flyway 的說明改為 Liquibase

### v1.1.0（2026-11-25）

- 步驟 0：種子資料分成正式資料（7.1）與只在開發環境的示範帳號（7.3）
- 步驟 6：匯入改用 `scripts/backup-to-sql.py`；不匯入時以 7.2 建立第一個管理員

### v1.0.0（2026-11-25）

- 初版：第一階段的步驟（骨架、登入、管理員與邀請碼、可見範圍與關懷配對、課程與聽課紀錄、心得回覆、試辦）、第二階段的項目、
  已決定與還沒決定的事
