import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'

/**
 * The documentation links to itself a lot (tables of contents, "see section 5.14", files in
 * src/). Renaming a heading or moving a file silently breaks those references, so check them.
 */

const root = process.cwd() // Vitest runs from the project root
const docs = [
  'README.md',
  'TODO.md',
  ...readdirSync(join(root, 'docs'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => `docs/${f}`)
]

/** Lines outside fenced code blocks, with their line numbers */
function prose(file: string): { line: string; no: number }[] {
  let inCode = false
  const lines: { line: string; no: number }[] = []
  readFileSync(join(root, file), 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (line.startsWith('```')) inCode = !inCode
      else if (!inCode) lines.push({ line, no: i + 1 })
    })
  return lines
}

/** The anchor GitHub gives a heading: lower case, punctuation dropped, spaces to hyphens */
function slug(heading: string): string {
  return heading
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // keep a link's text
    .replace(/[`*]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}_ -]/gu, '')
    .replace(/ /g, '-')
}

const anchorCache = new Map<string, Set<string>>()
function anchorsOf(file: string): Set<string> {
  let anchors = anchorCache.get(file)
  if (anchors) return anchors
  anchors = new Set()
  const seen = new Map<string, number>()
  for (const { line } of prose(file)) {
    const heading = /^#{1,6}\s+(.*)$/.exec(line)?.[1]
    if (heading === undefined) continue
    const base = slug(heading)
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    anchors.add(n === 0 ? base : `${base}-${n}`)
  }
  anchorCache.set(file, anchors)
  return anchors
}

describe('slug', () => {
  it('matches how GitHub names heading anchors', () => {
    expect(slug('5.14 時間與時區')).toBe('514-時間與時區')
    expect(slug('`POST /admin/invite-codes`')).toBe('post-admininvite-codes')
    expect(slug('跨網域（CORS）')).toBe('跨網域cors')
    expect(slug('2.22 auth_attempts（嘗試次數）')).toBe('222-auth_attempts嘗試次數')
  })
})

describe.each(docs)('%s', (file) => {
  it('links only to files and headings that exist', () => {
    const broken: string[] = []
    for (const { line, no } of prose(file)) {
      for (const [, target] of line.matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:)/.test(target!)) continue
        const [path, fragment] = target!.split('#') as [string, string | undefined]
        const dest = path ? normalize(join(dirname(file), path)) : file
        if (path && !existsSync(join(root, dest))) broken.push(`${no}: ${target} (no such file)`)
        else if (fragment && dest.endsWith('.md') && !anchorsOf(dest).has(fragment.toLowerCase()))
          broken.push(`${no}: ${target} (no such heading)`)
      }
    }
    expect(broken).toEqual([])
  })

  it('names only project files that exist', () => {
    const missing: string[] = []
    for (const { line, no } of prose(file)) {
      for (const [, path] of line.matchAll(
        /`((?:src|e2e|docs|\.github)\/[\w./-]+\.(?:ts|vue|md|json|css|yml))`/g
      )) {
        if (!existsSync(join(root, path!))) missing.push(`${no}: ${path}`)
      }
    }
    expect(missing).toEqual([])
  })
})
