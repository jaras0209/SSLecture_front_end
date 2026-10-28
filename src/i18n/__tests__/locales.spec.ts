/**
 * Locale message compile check.
 * vue-i18n 將 `@`（linked message）、`|`（複數分隔）、`{` `}`（插值）視為特殊語法，
 * 若字串含有未跳脫的特殊字元，執行時會編譯失敗並導致元件渲染中斷（畫面元素消失）。
 * 需要顯示字面字元時請使用 literal interpolation，例如 {'@'}、{'|'}。
 */
import { describe, it, expect } from 'vitest'
import { baseCompile } from '@intlify/message-compiler'
import zhTW from '@/i18n/locales/zh-TW.json'
import en from '@/i18n/locales/en.json'

type Messages = { [key: string]: string | Messages }

function collectProblems(obj: Messages, prefix = ''): string[] {
  const problems: string[] = []
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (typeof v === 'string') {
      const errors: string[] = []
      baseCompile(v, { onError: (e) => errors.push(e.message) })
      if (errors.length) problems.push(`${key}: ${errors.join('; ')}`)
      if (/(^|[^'])\|([^']|$)/.test(v)) problems.push(`${key}: unescaped "|" (plural separator)`)
    } else {
      problems.push(...collectProblems(v, key))
    }
  }
  return problems
}

describe('i18n locale messages', () => {
  it.each([
    ['zh-TW', zhTW],
    ['en', en]
  ])('%s messages compile without syntax errors', (_locale, messages) => {
    expect(collectProblems(messages as Messages)).toEqual([])
  })
})
