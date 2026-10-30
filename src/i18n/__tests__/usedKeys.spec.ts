import { describe, it, expect } from 'vitest'
import { globSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'
import zhTW from '../locales/zh-TW.json'
import en from '../locales/en.json'

// Every source file as text (tests excluded), to find the translation keys it uses.
// Read from disk rather than with import.meta.glob: importing them, even as ?raw, makes
// coverage treat every file as loaded (with nothing to count) and report it as covered.
const root = join(process.cwd(), 'src') // Vitest runs from the project root
const sources: Record<string, string> = Object.fromEntries(
  globSync('**/*.{vue,ts}', { cwd: root })
    .filter((file) => !file.split(sep).includes('__tests__'))
    .map((file) => [file, readFileSync(join(root, file), 'utf8')])
)

// Literal keys passed to $t / t / translate / tDynamic, e.g. $t('teacher.drawer.notes').
// Keys built at runtime (template strings) can't be checked statically.
const KEY_CALL = /(?:\$t|\bt|translate|tDynamic)\(\s*['"]([a-zA-Z][\w-]*(?:\.[\w-]+)+)['"]/g

function usedKeys(): Map<string, string[]> {
  const keys = new Map<string, string[]>()
  for (const [file, text] of Object.entries(sources)) {
    for (const [, key] of text.matchAll(KEY_CALL)) {
      keys.set(key, [...(keys.get(key) ?? []), file])
    }
  }
  return keys
}

const has = (messages: unknown, key: string) =>
  typeof key
    .split('.')
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined,
      messages
    ) === 'string'

describe('translation keys used in the code', () => {
  const keys = usedKeys()

  it('finds the keys used across the app', () => {
    expect(Object.keys(sources).length).toBeGreaterThan(30)
    expect(keys.size).toBeGreaterThan(300)
  })

  it.each([
    ['zh-TW', zhTW],
    ['en', en]
  ])('all exist in %s', (_, messages) => {
    const missing = [...keys]
      .filter(([key]) => !has(messages, key))
      .map(([key, files]) => `${key} (${files.join(', ')})`)
    expect(missing).toEqual([])
  })
})
