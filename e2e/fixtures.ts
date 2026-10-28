import { test as base, expect, type Page } from '@playwright/test'

type Seed = Record<string, unknown>

/** Signed-in users as the auth store stores them after a credentials login */
const signedIn = (username: string, role: string, church?: string) => ({
  username,
  role,
  loginMethod: 'credentials',
  church,
  avatarUrl: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}`
})

export const users = {
  student: signedIn('student', 'student', '愛與話語'),
  teacher: signedIn('teacher', 'teacher', '愛與話語'),
  admin: signedIn('admin', 'admin')
}

export const test = base.extend<{
  /** Clear localStorage, write the given keys, then open `path` (relative to the base URL) */
  openWith: (path: string, seed?: Seed) => Promise<void>
  /** Hosts outside localhost the page tried to contact during the test */
  externalHosts: Set<string>
}>({
  externalHosts: async ({ page }, use) => {
    const hosts = new Set<string>()
    // Keep tests hermetic: record and block every non-local request
    await page.route(
      (url) => url.hostname !== 'localhost',
      (route) => {
        hosts.add(new URL(route.request().url()).hostname)
        return route.abort()
      }
    )
    await use(hosts)
  },
  openWith: async ({ page, externalHosts: _ }, use) => {
    await use(async (path, seed = {}) => {
      await page.goto('login')
      await page.evaluate((entries) => {
        localStorage.clear()
        for (const [key, value] of entries) localStorage.setItem(key, JSON.stringify(value))
      }, Object.entries(seed))
      await page.goto(path)
    })
  }
})

export { expect }

/** Read a JSON value from localStorage, flushing debounced store writes first */
export async function stored<T = unknown>(page: Page, key: string): Promise<T> {
  return page.evaluate((k) => {
    window.dispatchEvent(new Event('pagehide'))
    return JSON.parse(localStorage.getItem(k) ?? 'null')
  }, key)
}
