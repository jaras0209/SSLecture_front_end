/**
 * @file persist.ts
 * @description 將 store 狀態以「延遲合併」方式寫入 localStorage。
 *
 * 原本每個 db 都用 deep watch 搭配 safeSet：Vue 會把同一個 tick 內的變更合併成一次，
 * 但連續的操作（快速勾選多個項目、連續新增／編輯主題或講師）每一次都會把整份 JSON
 * 重新序列化並寫入。
 *
 * 這裡改為：變更後等待 PERSIST_DELAY_MS，期間的多次變更只寫入一次。
 * 頁面隱藏或關閉時（visibilitychange → hidden、pagehide）會立即寫入所有尚未寫入的資料，
 * 避免使用者在延遲期間關閉分頁而遺失變更。
 *
 * 多分頁同步：其他分頁寫入同一個 key 時（storage 事件），套用它的值讓畫面跟著更新，
 * 並且不再寫回。若本分頁剛好有尚未寫入的變更，以另一個分頁剛儲存的內容為準
 * （last writer wins）——不同步時本分頁稍後的寫入會整份覆蓋對方的變更，更容易遺失資料。
 */

import { nextTick, watch, type Ref } from 'vue'
import { safeSet, onStorageChange } from '@/utils/storage'

/** 變更後延遲寫入的時間（毫秒） */
export const PERSIST_DELAY_MS = 300

/** key → 立即寫入該 key 的函式（僅包含尚未寫入的項目）；回傳是否寫入成功 */
const pendingWrites = new Map<string, () => boolean>()

/** key → 立即寫入該 key 的函式（所有以 persistToStorage 保存的資料） */
const allWrites = new Map<string, () => boolean>()

/**
 * 立即寫入所有保存的資料，包括從未改過、所以從未寫入過的預設值（例如備份前：
 * 備份讀的是 localStorage）。回傳是否全部寫入成功。
 */
export function saveAllPersisted(): boolean {
  let ok = true
  for (const write of [...allWrites.values()]) ok = write() && ok
  return ok
}

/** 立即寫入所有尚未寫入的資料；回傳是否全部寫入成功（沒有待寫入的也算成功）。 */
export function flushPersistence(): boolean {
  let ok = true
  for (const write of [...pendingWrites.values()]) ok = write() && ok
  return ok
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushPersistence)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushPersistence()
  })
}

/**
 * 監看 source（deep），變更後延遲寫入 localStorage[key]。
 * 同一個 key 只保留最後一次的值。
 */
export function persistToStorage<T>(source: Ref<T>, key: string, delay = PERSIST_DELAY_MS): void {
  let timer: ReturnType<typeof setTimeout> | null = null
  // Set while applying another tab's value, so the watcher doesn't write it back
  let applyingRemote = false

  const write = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    pendingWrites.delete(key)
    return safeSet(key, source.value)
  }
  allWrites.set(key, write)

  watch(
    source,
    () => {
      if (applyingRemote) return
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(write, delay)
      pendingWrites.set(key, write)
    },
    { deep: true }
  )

  onStorageChange(key, (raw) => {
    if (raw === null) return // removed / cleared elsewhere: keep this tab's state
    let next: T
    try {
      next = JSON.parse(raw) as T
    } catch {
      return
    }
    // Another tab just saved this key: take its value and drop our pending write of the old state
    if (timer !== null) clearTimeout(timer)
    timer = null
    pendingWrites.delete(key)
    applyingRemote = true
    source.value = next
    // Reset after the watcher has run (or immediately if the value didn't change and it never fires)
    void nextTick(() => {
      applyingRemote = false
    })
  })
}
