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
import { safeGet, safeSet } from '@/utils/storage'

const LANG_KEY = 'superstart_lang'
export type SupportedLocale = 'zh-TW' | 'en'
type MessageSchema = typeof zhTW

const savedLocale = safeGet<SupportedLocale>(LANG_KEY, 'zh-TW')

export const i18n = createI18n<[MessageSchema], SupportedLocale>({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'zh-TW',
  messages: {
    'zh-TW': zhTW,
    en,
  },
})

export function setLocale(lang: SupportedLocale) {
  ;(i18n.global.locale as unknown as Ref<SupportedLocale>).value = lang
  safeSet(LANG_KEY, lang)
  document.documentElement.lang = lang === 'zh-TW' ? 'zh-TW' : 'en'
}

export default i18n
