/// <reference types="vite/client" />

/**
 * 前端環境變數型別宣告
 * 對應 .env.example 中列出的所有 VITE_ 變數
 */
interface ImportMetaEnv {
  /** 後端 Spring Boot API 基底 URL（後端就緒後填入） */
  readonly VITE_API_BASE_URL: string
  /** Google OAuth 2.0 Client ID */
  readonly VITE_GOOGLE_CLIENT_ID: string
  /** LINE Login Channel ID */
  readonly VITE_LINE_CHANNEL_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
