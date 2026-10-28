/**
 * @file src/i18n/index.ts
 * @description vue-i18n plugin 初始化。
 * - legacy: false → Composition API 模式（與 <script setup> 風格一致）
 * - 語系偏好以 superstart_lang 鍵儲存於 localStorage
 */

import { createI18n } from 'vue-i18n'
import type { Ref } from 'vue'
import zhTW from './locales/zh-TW.json'
import en from './locales/en.json'
import { safeGet, safeSet, onStorageChange } from '@/utils/storage'

const LANG_KEY = 'superstart_lang'
export type SupportedLocale = 'zh-TW' | 'en'
type MessageSchema = typeof zhTW

const rawSavedLocale = safeGet<string>(LANG_KEY, 'zh-TW', { clearOnError: true })
const savedLocale: SupportedLocale = rawSavedLocale === 'en' ? 'en' : 'zh-TW'

export const i18n = createI18n<[MessageSchema], SupportedLocale>({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'zh-TW',
  messages: {
    'zh-TW': zhTW,
    en
  }
})

/**
 * 在元件外（store、工具函式）翻譯，跟隨目前語系；須在呼叫時才執行（i18n 已就緒）。
 * vue-i18n 的 t() 無法對動態 key 推導型別，型別轉換集中在這裡。
 */
export function translate(key: string, values?: Record<string, unknown>): string {
  return (i18n.global.t as (k: string, v: Record<string, unknown>) => string)(key, values ?? {})
}

function applyLocale(lang: SupportedLocale) {
  ;(i18n.global.locale as unknown as Ref<SupportedLocale>).value = lang
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang === 'zh-TW' ? 'zh-TW' : 'en'
  }
}

export function setLocale(lang: SupportedLocale) {
  applyLocale(lang)
  safeSet(LANG_KEY, lang)
}

// Language switched in another tab: follow it without writing it back
onStorageChange(LANG_KEY, (raw) => {
  if (raw === null) return
  try {
    applyLocale(JSON.parse(raw) === 'en' ? 'en' : 'zh-TW')
  } catch {
    // ignore malformed values
  }
})

export default i18n
