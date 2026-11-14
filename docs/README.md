# SSLecture 文件導覽

> **最後更新**：2026-11-14

前端已先做好，資料暫存在瀏覽器裡；這裡的規格依前端的實作與資料結構整理，給接手實作 Spring Boot 後端的人。
專案本身怎麼執行、測試、部署，見根目錄的 [`README.md`](../README.md)。

## 文件一覽

| 文件 | 內容 | 給誰看 | 版本 |
| :--- | :--- | :--- | :--- |
| [`backend_api_spec.md`](./backend_api_spec.md) | 所有 API 的請求與回應、可見範圍規則、嘗試次數限制、登入期限、CORS、錯誤碼、資料模型、前端串接步驟 | 後端、串接 API 的前端 | v1.8.1 |
| [`database_schema.md`](./database_schema.md) | 22 張資料表、索引、設計決策、PostgreSQL 建表 SQL、種子資料、ERD、從前端備份搬移資料 | 後端、資料庫管理 | v1.8.1 |
| [`oauth2_social_login_spec.md`](./oauth2_social_login_spec.md) | Google / LINE 登入流程、Spring Security 設定、前端整合、帳號綁定、安全性、第三方平台設定 | 實作社群登入的後端 | v1.1.1 |
| [`../TODO.md`](../TODO.md) | 後端上線前要完成的項目（安全性、資料表、各 store 改接 API、資料搬移、部署） | 專案負責人、後端 | — |

各文件開頭有目錄，文末有〈版本紀錄〉記錄每一版改了什麼。

## 建議閱讀順序（後端）

1. API 規格[第 1 節〈通用規範〉](./backend_api_spec.md#1-通用規範)：回應格式、認證、可見範圍、時間格式、嘗試次數限制、CORS
2. 資料庫設計[第 1 節總覽](./database_schema.md#1-資料庫設計總覽)與[第 5 節設計決策](./database_schema.md#5-設計決策與說明)，
   再以[第 6 節的 SQL](./database_schema.md#6-sql-建表語句postgresql) 建立資料庫
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
| 錯誤碼與訊息 | API [第 12 節](./backend_api_spec.md#12-錯誤碼一覽) | `src/utils/api.ts`、語系檔的 `api.codes` |
| 時間與時區 | API〈[時間格式](./backend_api_spec.md#時間格式)〉、資料庫 [5.14](./database_schema.md#514-時間與時區) | `src/utils/datetime.ts` |
| 社群登入 | [`oauth2_social_login_spec.md`](./oauth2_social_login_spec.md) | `src/views/LoginCallback.vue`、`src/views/OnboardingView.vue`、`src/stores/auth.ts` |
| 前端資料搬進資料庫 | API〈[搬移既有資料](./backend_api_spec.md#搬移既有資料)〉、資料庫[第 9 節](./database_schema.md#9-從前端備份搬移資料) | `src/utils/backup.ts` |
| 跨網域與內容安全政策 | API〈[跨網域（CORS）](./backend_api_spec.md#跨網域cors)〉、根目錄 README〈[安全性標頭與跨網域](../README.md#安全性標頭與跨網域)〉 | `src/utils/csp.ts` |

## 維護方式

- **程式與文件一起改**：改到 API、資料表或上面這些規則時，同一次修改一併更新文件
- **改版**：更新文件開頭的版本號與日期，並在文末〈版本紀錄〉加一筆。只是整理、修正說明時加第三碼（v1.8.0 → v1.8.1），
  新增或修改端點、欄位、規則時加第二碼（v1.8.1 → v1.9.0）；這張表的版本欄、[`TODO.md`](../TODO.md) 開頭的版本也跟著改
- **新增了什麼寫在〈版本紀錄〉**，不在標題或表格加 ⭐、NEW 之類的記號（幾個版本後就看不出是哪一版新增的）
- **連結會被檢查**：`npm test` 會確認這些文件、根目錄 README 與 TODO 裡的連結、章節錨點，以及以反引號寫出的
  `src/…`、`e2e/…` 等檔案路徑都存在（`src/__tests__/docs.spec.ts`）。改標題或搬移檔案後，請一併更新引用它的地方
