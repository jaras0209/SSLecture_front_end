/**
 * @file src/i18n/index.ts
 * @description vue-i18n plugin 初始化。
 * - legacy: false → Composition API 模式（與 <script setup> 風格一致）
 * - 語系偏好以 superstart_lang 鍵儲存於 localStorage
 * - zh-TW（預設與 fallback）隨主程式載入；en 為獨立 chunk，第一次需要時才下載
 */

import { createI18n } from 'vue-i18n'
import type { Ref } from 'vue'
import zhTW from './locales/zh-TW.json'
import { safeGet, safeSet, onStorageChange } from '@/utils/storage'

const LANG_KEY = 'superstart_lang'
export type SupportedLocale = 'zh-TW' | 'en'
type MessageSchema = typeof zhTW

const rawSavedLocale = safeGet<string>(LANG_KEY, 'zh-TW', { clearOnError: true })
const savedLocale: SupportedLocale = rawSavedLocale === 'en' ? 'en' : 'zh-TW'

// Starts in zh-TW; initLocale() switches to the saved locale (loading it first) before mount
export const i18n = createI18n<[MessageSchema], SupportedLocale>({
  legacy: false,
  locale: 'zh-TW',
  fallbackLocale: 'zh-TW',
  messages: { 'zh-TW': zhTW } as Record<SupportedLocale, MessageSchema>
})

const loaders: Record<SupportedLocale, () => Promise<MessageSchema>> = {
  'zh-TW': async () => zhTW,
  en: () => import('./locales/en.json').then((m) => m.default as MessageSchema)
}
const loaded = new Set<SupportedLocale>(['zh-TW'])

/** Load a locale's messages if they haven't been loaded yet */
export async function loadLocale(lang: SupportedLocale): Promise<void> {
  if (loaded.has(lang)) return
  i18n.global.setLocaleMessage(lang, await loaders[lang]())
  loaded.add(lang)
}

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

// The most recently requested locale: a slow load must not override a later choice
let requested: SupportedLocale = 'zh-TW'

/** Load (if needed) and switch to `lang`; resolves false if a later request superseded it */
async function switchTo(lang: SupportedLocale): Promise<boolean> {
  requested = lang
  await loadLocale(lang)
  if (requested !== lang) return false
  applyLocale(lang)
  return true
}

export async function setLocale(lang: SupportedLocale): Promise<void> {
  if (await switchTo(lang)) safeSet(LANG_KEY, lang)
}

/**
 * Apply the saved locale before the app mounts, so English users don't see a flash of
 * Chinese. If the messages fail to load, the app stays in zh-TW.
 */
export async function initLocale(): Promise<void> {
  try {
    await switchTo(savedLocale)
  } catch (err) {
    console.error('[i18n] Failed to load locale', savedLocale, err)
  }
}

// Language switched in another tab: follow it without writing it back
onStorageChange(LANG_KEY, (raw) => {
  if (raw === null) return
  let lang: SupportedLocale
  try {
    lang = JSON.parse(raw) === 'en' ? 'en' : 'zh-TW'
  } catch {
    return // ignore malformed values
  }
  switchTo(lang).catch((err) => console.error('[i18n] Failed to load locale', lang, err))
})

export default i18n
