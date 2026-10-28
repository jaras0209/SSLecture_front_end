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
 */

import { watch, type Ref } from 'vue'
import { safeSet } from '@/utils/storage'

/** 變更後延遲寫入的時間（毫秒） */
export const PERSIST_DELAY_MS = 300

/** key → 立即寫入該 key 的函式（僅包含尚未寫入的項目） */
const pendingWrites = new Map<string, () => void>()

/** 立即寫入所有尚未寫入的資料。 */
export function flushPersistence(): void {
  for (const write of [...pendingWrites.values()]) write()
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

  const write = () => {
    if (timer !== null) clearTimeout(timer)
    timer = null
    pendingWrites.delete(key)
    safeSet(key, source.value)
  }

  watch(
    source,
    () => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(write, delay)
      pendingWrites.set(key, write)
    },
    { deep: true }
  )
}
