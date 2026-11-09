import { describe, it, expect } from 'vitest'
import { globSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

/*
 * An avatar can be an address someone typed. Every <img> showing one must not tell that
 * server which of our pages it is on (referrerpolicy), and must fall back to the default
 * avatar when the address doesn't work, rather than show a broken image.
 */
const root = join(process.cwd(), 'src')
const ATTRS = `((?:"[^"]*"|'[^']*'|[^>"'])*)`

describe('avatar images', () => {
  it('send no referrer and fall back when the image fails', () => {
    const missing: string[] = []
    let found = 0
    for (const file of globSync('**/*.vue', { cwd: root })) {
      if (file.split(sep).includes('__tests__')) continue
      const source = readFileSync(join(root, file), 'utf8')
      const template = source.slice(0, source.indexOf('<script'))
      for (const m of template.matchAll(new RegExp(`<img\\b${ATTRS}>`, 'g'))) {
        const attrs = m[1]
        if (!attrs.includes('avatarSrc(')) continue
        found++
        const ok =
          /referrerpolicy="no-referrer"/.test(attrs) && /@error="useFallbackAvatar"/.test(attrs)
        if (!ok) missing.push(`${file}:${template.slice(0, m.index).split('\n').length}`)
      }
    }
    expect(found).toBeGreaterThanOrEqual(11)
    expect(missing).toEqual([])
  })
})
