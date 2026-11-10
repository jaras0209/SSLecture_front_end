/**
 * 在畫面開著的時候執行登入期限（utils/session.ts）：使用者有操作就記下；
 * 到期前 5 分鐘提醒（可按「繼續使用」），到期就登出並回到登入頁，登入頁會說明原因。
 * 其他分頁會因登入狀態同步（stores/auth.ts）一起登出；任一分頁有操作，所有分頁的提醒都會收起。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { onStorageChange } from '@/utils/storage'
import { noteSignOutReason, sessionExpired, sessionTimeLeft, touchSession } from '@/utils/session'

/** Warn this long before signing out */
export const WARN_BEFORE_MS = 5 * 60 * 1000
const CHECK_EVERY_MS = 15 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const

export function useSessionTimeout() {
  const authStore = useAuthStore()
  const router = useRouter()

  /** Minutes until the automatic sign-out, while it is close enough to warn; else null */
  const minutesLeft = ref<number | null>(null)

  /** Sign out if the session ran out, else update the warning; returns whether it signed out */
  function check(): boolean {
    if (authStore.isAuthenticated && sessionExpired()) {
      minutesLeft.value = null
      noteSignOutReason('idle')
      authStore.logout()
      void router.replace('/login')
      return true
    }
    const left = authStore.isAuthenticated ? sessionTimeLeft() : null
    minutesLeft.value =
      left !== null && left <= WARN_BEFORE_MS ? Math.max(1, Math.ceil(left / 60_000)) : null
    return false
  }

  function onActivity() {
    // Activity after the session ran out (e.g. a laptop woken up) doesn't revive it
    if (!authStore.isAuthenticated || check()) return
    touchSession()
    if (minutesLeft.value !== null) check()
  }

  /** "Keep me signed in": count from now (the warning shows minutes after the last activity) */
  function stayActive() {
    if (!authStore.isAuthenticated || check()) return
    touchSession()
    check()
  }

  function onVisible() {
    if (document.visibilityState === 'visible') check()
  }

  let timer: ReturnType<typeof setInterval> | undefined
  let stopWatchingOtherTabs: (() => void) | undefined
  onMounted(() => {
    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true, capture: true })
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', check)
    // Activity in another tab: drop this tab's warning right away
    stopWatchingOtherTabs = onStorageChange('superstart_session', () => check())
    timer = setInterval(check, CHECK_EVERY_MS)
    check()
  })
  onBeforeUnmount(() => {
    for (const name of ACTIVITY_EVENTS) {
      window.removeEventListener(name, onActivity, { capture: true })
    }
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('focus', check)
    stopWatchingOtherTabs?.()
    clearInterval(timer)
  })

  return { minutesLeft, stayActive, check }
}
