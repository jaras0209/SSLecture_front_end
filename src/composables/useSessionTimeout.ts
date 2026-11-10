/**
 * 在畫面開著的時候執行登入期限（utils/session.ts）：使用者有操作就記下，
 * 每分鐘、以及分頁回到前景時檢查；閒置太久就登出並回到登入頁，登入頁會說明原因。
 * 其他分頁會因登入狀態同步（stores/auth.ts）一起登出。
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { noteSignOutReason, sessionExpired, touchSession } from '@/utils/session'

const CHECK_EVERY_MS = 60 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

export function useSessionTimeout() {
  const authStore = useAuthStore()
  const router = useRouter()

  function onActivity() {
    // Activity after the session ran out (e.g. a laptop woken up) doesn't revive it
    if (authStore.isAuthenticated && !check()) touchSession()
  }

  /** Sign out if the session ran out; returns whether it did */
  function check(): boolean {
    if (!authStore.isAuthenticated || !sessionExpired()) return false
    noteSignOutReason('idle')
    authStore.logout()
    void router.replace('/login')
    return true
  }

  function onVisible() {
    if (document.visibilityState === 'visible') check()
  }

  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true, capture: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    timer = setInterval(check, CHECK_EVERY_MS)
    check()
  })
  onBeforeUnmount(() => {
    for (const name of ACTIVITY_EVENTS) {
      window.removeEventListener(name, onActivity, { capture: true })
    }
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', check)
    clearInterval(timer)
  })

  return { check }
}
