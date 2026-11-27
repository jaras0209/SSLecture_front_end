# SSLecture 文件導覽

> **最後更新**：2026-11-26

前端已先做好，資料暫存在瀏覽器裡；這裡的規格依前端的實作與資料結構整理，給接手實作 Spring Boot 後端的人。
後端在 [`SSLecture_backend`](https://github.com/jaras0209/SSLecture_backend)（Spring Boot、Liquibase），資料庫使用 MySQL 8.4。
專案本身怎麼執行、測試、部署，見根目錄的 [`README.md`](../README.md)。

## 文件一覽

| 文件 | 內容 | 給誰看 | 版本 |
| :--- | :--- | :--- | :--- |
| [`backend_api_spec.md`](./backend_api_spec.md) | 所有 API 的請求與回應、可見範圍規則、嘗試次數限制、登入期限、CORS、錯誤碼、資料模型、前端串接步驟 | 後端、串接 API 的前端 | v1.15.0 |
| [`database_schema.md`](./database_schema.md) | 22 張資料表、索引、設計決策、MySQL 建表 SQL 與連線設定、種子資料、ERD、從前端備份搬移資料 | 後端、資料庫管理 | v1.16.2 |
| [`oauth2_social_login_spec.md`](./oauth2_social_login_spec.md) | Google / LINE 登入流程、Spring Security 設定、前端整合、帳號綁定、安全性、第三方平台設定 | 實作社群登入的後端 | v1.1.2 |
| [`backend_phase1_plan.md`](./backend_phase1_plan.md) | 後端第一階段的工作順序（帳號密碼登入、管理員、關懷配對、聽課紀錄、心得回覆、試辦）、第二階段的項目、已決定與還沒決定的事 | 專案負責人、後端 | v1.4.1 |
| [`../TODO.md`](../TODO.md) | 後端上線前要完成的項目（安全性、資料表、各 store 改接 API、資料搬移、部署） | 專案負責人、後端 | — |

各文件開頭有目錄，文末有〈版本紀錄〉記錄每一版改了什麼。

## 建議閱讀順序（後端）

0. 先看[第一階段工作計畫](./backend_phase1_plan.md)：哪些功能先做、依什麼順序
1. API 規格[第 1 節〈通用規範〉](./backend_api_spec.md#1-通用規範)：回應格式、認證、可見範圍、時間格式、嘗試次數限制、CORS
2. 資料庫設計[第 1 節總覽](./database_schema.md#1-資料庫設計總覽)與[第 5 節設計決策](./database_schema.md#5-設計決策與說明)，
   再以[第 6 節的 SQL](./database_schema.md#6-sql-建表語句mysql) 建立資料庫
3. API 規格第 2–10 節：依功能逐一實作
4. 社群登入：[`oauth2_social_login_spec.md`](./oauth2_social_login_spec.md)，先完成[第 9 章的平台設定](./oauth2_social_login_spec.md#9-第三方平台設定清單)
5. 上線前：對照 [`TODO.md`](../TODO.md)，並依 [API 規格第 13 節](./backend_api_spec.md#13-前端串接遷移指南)、
   [資料庫設計第 9 節](./database_schema.md#9-從前端備份搬移資料)把前端改接 API、搬移既有資料

## 依主題查找

同一個規則常同時寫在 API 規格與資料庫設計裡，前端也已有對應的實作：

| 主題 | 文件 | 前端實作 |
| :--- | :--- | :--- |
| 誰看得到誰（教會、性別分開、家長綁定、講師） | API〈[可見範圍規則](./backend_api_spec.md#可見範圍規則誰看得到誰)〉、資料庫 [5.10–5.13](./database_schema.md#510-性別分開管理與可見範圍) | `src/utils/scope.ts` |
| 登入期限、記住我、帳號變更後登出 | API〈[記住我與閒置登出](./backend_api_spec.md#記住我與閒置登出)〉、資料庫 [5.15](./database_schema.md#515-登入期限與失效) | `src/utils/session.ts` |
| 帳號與密碼規則 | API〈[密碼規則](./backend_api_spec.md#密碼規則)〉、[`POST /auth/register`](./backend_api_spec.md#post-authregister) | `src/utils/account.ts`、`src/composables/usePasswordStrength.ts` |
| 嘗試次數限制 | API〈[嘗試次數限制](./backend_api_spec.md#嘗試次數限制)〉、資料庫 [2.22](./database_schema.md#222-auth_attempts-嘗試次數) | `src/utils/api.ts`（顯示 `429` 的等待時間） |
| 聽課時間、生日、專題課日期不可是未來 | API〈[`PATCH /shining/:username`](./backend_api_spec.md#patch-shiningusername)〉、資料庫 [5.17](./database_schema.md#517-已發生事件的日期) | `src/utils/recordRules.ts` |
| 預約與確認的時間、何時可記錄出席與完成 | API〈[聽課預約](./backend_api_spec.md#10-聽課預約-booking-system)〉的時間規則、資料庫 [5.17](./database_schema.md#517-已發生事件的日期) | `src/utils/bookingRules.ts` |
| 專題主題改名、刪除時學員的紀錄 | API〈[專題主題 Themes](./backend_api_spec.md#專題主題-themes)〉、資料庫 [5.3](./database_schema.md#53-shining_lectures-的-theme_name-為何不用外鍵) | `src/stores/parts/courseThemes.ts` |
| 講師不重複、一個帳號一筆講師 | API〈[`POST /lecturers`](./backend_api_spec.md#post-lecturers)〉、資料庫 [2.4](./database_schema.md#24-lecturers-講師) | `src/stores/parts/courseLecturers.ts` |
| 文字欄位長度上限 | API〈[欄位長度上限](./backend_api_spec.md#欄位長度上限)〉、資料庫 [5.16](./database_schema.md#516-文字欄位長度) | `src/utils/limits.ts` |
| 錯誤碼與訊息 | API [第 12 節](./backend_api_spec.md#12-錯誤碼一覽) | `src/utils/api.ts`、語系檔的 `api.codes` |
| 時間與時區 | API〈[時間格式](./backend_api_spec.md#時間格式)〉、資料庫 [5.14](./database_schema.md#514-時間與時區) | `src/utils/datetime.ts` |
| 社群登入 | [`oauth2_social_login_spec.md`](./oauth2_social_login_spec.md) | `src/views/LoginCallback.vue`、`src/views/OnboardingView.vue`、`src/stores/auth.ts` |
| 前端資料搬進資料庫 | API〈[搬移既有資料](./backend_api_spec.md#搬移既有資料)〉、資料庫[第 9 節](./database_schema.md#9-從前端備份搬移資料) | `src/utils/backup.ts`；匯入工具 `scripts/backup-to-sql.py` |
| 跨網域與內容安全政策 | API〈[跨網域（CORS）](./backend_api_spec.md#跨網域cors)〉、根目錄 README〈[安全性標頭與跨網域](../README.md#安全性標頭與跨網域)〉 | `src/utils/csp.ts` |

## 維護方式

- **程式與文件一起改**：改到 API、資料表或上面這些規則時，同一次修改一併更新文件
- **改版**：更新文件開頭的版本號與日期，並在文末〈版本紀錄〉加一筆。只是整理、修正說明時加第三碼（v1.8.0 → v1.8.1），
  新增或修改端點、欄位、規則時加第二碼（v1.8.1 → v1.9.0）；這張表的版本欄、[`TODO.md`](../TODO.md) 開頭的版本也跟著改
- **新增了什麼寫在〈版本紀錄〉**，不在標題或表格加 ⭐、NEW 之類的記號（幾個版本後就看不出是哪一版新增的）
- **連結會被檢查**：`npm test` 會確認這些文件、根目錄 README 與 TODO 裡的連結、章節錨點，以及以反引號寫出的
  `src/…`、`e2e/…` 等檔案路徑都存在（`src/__tests__/docs.spec.ts`）。改標題或搬移檔案後，請一併更新引用它的地方
- **建表 SQL 會被檢查**：改到 [`database_schema.md`](./database_schema.md) 時，CI 以 MySQL 8.4 實際建表並測試各項限制
  與備份匯入（`scripts/check-schema.py`）。新增限制時，請在該檔的 `CASES` 加上應被拒絕與應被接受的例子；
  前端儲存的資料結構改變時，`npm test` 會因範例備份 `scripts/fixtures/sample-backup.json` 不同而失敗
  （`src/__tests__/sampleBackup.spec.ts`）：執行 `npm run fixtures:backup` 重新產生，並確認 `scripts/backup-to-sql.py` 是否要跟著改
- **後端的建表 SQL 與文件一致**：後端 `SSLecture_backend` 的 Liquibase changelog（001–003）由
  `scripts/gen-backend-changelog.py` 從 [`database_schema.md`](./database_schema.md) 第 6、7 節產生。改結構時先改文件，
  再執行 `python3 scripts/gen-backend-changelog.py <後端的 db/changelog/changes>` 並提交到後端；
  CI（`schema.yml`）改文件時與每週比對後端 `main`，不一致就失敗。正式環境上線後，結構變更改為新增 changeset（004 起），不再比對 001–003
