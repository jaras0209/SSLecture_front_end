import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import zhTW from '../locales/zh-TW.json'
import en from '../locales/en.json'

// The error codes table (section 12) of the backend API spec, read from disk
const spec = readFileSync(join(process.cwd(), 'docs', 'backend_api_spec.md'), 'utf8')
const table = spec.slice(spec.indexOf('## 12. 錯誤碼一覽'), spec.indexOf('## 13.'))
const documented = [...table.matchAll(/^\| \d{3} \| `([A-Z_]+)` \|/gm)].map((m) => m[1])

// VALIDATION_ERROR keeps the backend's message, which says which field is wrong
const translatedByFrontend = documented.filter((code) => code !== 'VALIDATION_ERROR')

describe('API error codes', () => {
  it('reads the documented codes', () => {
    expect(documented).toContain('STUDENT_NOT_VISIBLE')
    expect(documented.length).toBeGreaterThan(15)
  })

  it.each([
    ['zh-TW', zhTW.api.codes],
    ['en', en.api.codes]
  ])('every documented code has a %s message', (_locale, codes) => {
    const missing = translatedByFrontend.filter((code) => !(code in codes))
    expect(missing).toEqual([])
  })
})
