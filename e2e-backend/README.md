# 前端接上後端的端對端測試

以瀏覽器測試「接上後端」的前端（`VITE_DEMO_MODE=false`）：登入、註冊、登出、修改密碼、後端結束登入，
以及管理員的帳號與邀請碼。檢查都透過 API，不直接查資料庫，所以可對任何版本的 `SSLecture_backend` 執行；
後端還沒有管理員 API 時，管理員的測試會略過並說明原因。

CI：`.github/workflows/backend-e2e.yml`（登入與管理員相關的檔案改動時，以及每週一次；可手動指定後端的分支）。

## 在本機執行

1. 啟動後端（見 [SSLecture_backend](https://github.com/jaras0209/SSLecture_backend) 的 README），
   並允許測試用的網址跨網域：

   ```bash
   CORS_ALLOWED_ORIGINS=http://localhost:4174 ./mvnw spring-boot:run
   ```

2. 執行測試（會以後端模式建置前端到 `dist-backend/`，再以 `vite preview` 提供）：

   ```bash
   npx playwright test -c playwright.backend.config.ts
   ```

後端不在 `http://localhost:8080` 時，以 `E2E_API_URL` 指定。測試會註冊名稱以 `e2e`、`reg.`、`pwd.` 等開頭的帳號，
請使用開發用的資料庫。
