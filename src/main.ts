import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from '@/i18n'
import '@/assets/styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(i18n)     // i18n 必須在 router 之前注入，以便 store 可呼叫 i18n.global.t()
app.use(router)

/**
 * 全域錯誤捕獲
 * 攔截所有子元件未處理的 JavaScript 錯誤，避免白屏。
 * 生產環境可在此接入 Sentry / LogRocket 等錯誤監控服務。
 *
 * TODO（後端就緒後）：
 *   將 console.error 替換為傳送錯誤報告到後端 /api/errors endpoint
 */
app.config.errorHandler = (err, instance, info) => {
  // 開發環境：印出詳細資訊協助除錯
  if (import.meta.env.DEV) {
    console.error('[全域錯誤捕獲]', {
      error: err,
      component: instance?.$options?.name ?? '未知元件',
      info
    })
  }

  // 生產環境：靜默記錄（避免使用者看到 console 錯誤）
  // TODO: 在此呼叫錯誤回報 API，例如：
  // fetch('/api/errors', { method: 'POST', body: JSON.stringify({ err, info }) })
}

/**
 * 未處理的 Promise rejection 捕獲
 * 例如：fetch 失敗未加 .catch()、async 函式內未處理的例外
 */
window.addEventListener('unhandledrejection', (event) => {
  if (import.meta.env.DEV) {
    console.error('[未處理的 Promise 錯誤]', event.reason)
  }
  // 防止瀏覽器預設行為（控制台紅字）在生產環境中顯示
  event.preventDefault()
})

app.mount('#app')
