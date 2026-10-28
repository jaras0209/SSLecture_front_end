import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from '@/i18n'
import '@/assets/styles/main.css'

const app = createApp(App)

app.use(createPinia())
app.use(i18n) // i18n 必須在 router 之前注入，以便 store 可呼叫 i18n.global.t()
app.use(router)

/**
 * 錯誤回報的單一出口。
 * 正式環境也一律記錄到 console：原本只在開發環境輸出，上線後出錯完全無跡可查。
 *
 * TODO（後端就緒後）：在此傳送錯誤報告到後端 /api/errors 或 Sentry 等監控服務
 */
function reportError(source: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[${source}]`, error, ...(context ? [context] : []))
}

/**
 * 全域錯誤捕獲
 * 攔截所有子元件未處理的 JavaScript 錯誤，避免白屏。
 */
app.config.errorHandler = (err, instance, info) => {
  reportError('GlobalErrorCapture', err, {
    component: instance?.$options?.name ?? 'UnknownComponent',
    info
  })
}

/**
 * 未處理的 Promise rejection 捕獲
 * 例如：fetch 失敗未加 .catch()、async 函式內未處理的例外
 */
window.addEventListener('unhandledrejection', (event) => {
  reportError('UnhandledPromiseRejection', event.reason)
  // 已由 reportError 記錄，避免瀏覽器再輸出一次相同的 "Uncaught (in promise)" 訊息
  event.preventDefault()
})

app.mount('#app')
