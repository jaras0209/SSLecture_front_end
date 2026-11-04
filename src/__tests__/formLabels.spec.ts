import { describe, it, expect } from 'vitest'
import { globSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

/*
 * Every form field must have a name a screen reader can announce. axe accepts a
 * placeholder as that name, so it misses labels that aren't tied to their field;
 * this reads the templates instead.
 */
const root = join(process.cwd(), 'src') // Vitest runs from the project root
const templates = globSync('**/*.vue', { cwd: root })
  .filter((file) => !file.split(sep).includes('__tests__'))
  .map((file) => {
    const source = readFileSync(join(root, file), 'utf8')
    const end = source.indexOf('<script')
    const template = (end === -1 ? source : source.slice(0, end)).replace(/<!--[\s\S]*?-->/g, '')
    return { file, template }
  })

const lineOf = (text: string, index: number) => text.slice(0, index).split('\n').length

// A tag's attributes, read past quoted values (which may contain ">", e.g. v-if="n > 0")
const ATTRS = `((?:"[^"]*"|'[^']*'|[^>"'])*)`
const tag = (names: string, flags = 'g') => new RegExp(`<(${names})\\b${ATTRS}>`, flags)

describe('form fields have names', () => {
  it('every <label> is tied to a field (for= or wrapping it)', () => {
    const loose: string[] = []
    for (const { file, template } of templates) {
      for (const m of template.matchAll(
        new RegExp(`<label\\b${ATTRS}>([\\s\\S]*?)<\\/label>`, 'g')
      )) {
        const [, attrs, inner] = m
        if (/(^|\s):?for=/.test(attrs) || /<(input|select|textarea)\b/.test(inner)) continue
        loose.push(`${file}:${lineOf(template, m.index)}`)
      }
    }
    expect(loose).toEqual([])
  })

  it('every for= points at an id in the same component', () => {
    const dangling: string[] = []
    for (const { file, template } of templates) {
      const ids = new Set([...template.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))
      for (const m of template.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)) {
        if (!ids.has(m[1])) dangling.push(`${file}:${lineOf(template, m.index)} for="${m[1]}"`)
      }
    }
    expect(dangling).toEqual([])
  })

  it('every field has a label, an aria-label or aria-labelledby (not just a placeholder)', () => {
    const unnamed: string[] = []
    for (const { file, template } of templates) {
      const labelled = new Set(
        [...template.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)].map((m) => m[1])
      )
      // Fields inside a <label> are named by it
      const wrapped = [...template.matchAll(/<label\b[^>]*>[\s\S]*?<\/label>/g)].map((m) => [
        m.index,
        m.index + m[0].length
      ])
      for (const m of template.matchAll(tag('input|select|textarea'))) {
        const attrs = m[2]
        if (/type="(hidden|submit|button)"/.test(attrs)) continue
        if (/(^|\s):?aria-label(ledby)?=/.test(attrs)) continue
        const id = /\sid="([^"]+)"/.exec(attrs)?.[1]
        if (id && labelled.has(id)) continue
        if (/(^|\s):id=/.test(attrs) && /<label\b[^>]*\s:for=/.test(template)) continue
        if (wrapped.some(([start, end]) => m.index > start && m.index < end)) continue
        unnamed.push(`${file}:${lineOf(template, m.index)} <${m[1]}>`)
      }
    }
    expect(unnamed).toEqual([])
  })
})
