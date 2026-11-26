/**
 * Helpers for the tests against a running SSLecture_backend: sign in through the page, and talk to
 * the API directly to set things up or check what the server has.
 */
import { expect, test as base, type APIRequestContext, type Page } from '@playwright/test'
import { API_URL } from '../playwright.backend.config'

export { expect }

/** The demo accounts the backend creates in dev (Liquibase, docs/database_schema.md 7.3) */
export const DEMO_PASSWORD = '123456'
export const STRONG_PASSWORD = 'Abc123!x'

let seq = 0
/** A username no other run has used */
export function newUsername(prefix = 'e2e'): string {
  seq++
  return `${prefix}.${Date.now().toString(36)}${seq}`
}

export class Api {
  private readonly request: APIRequestContext

  constructor(request: APIRequestContext) {
    this.request = request
  }

  async call<T>(method: string, path: string, body?: unknown, token?: string) {
    const res = await this.request.fetch(API_URL + path, {
      method,
      data: body,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const json = (await res.json().catch(() => null)) as {
      success: boolean
      data: T
      error?: { code: string }
    } | null
    return { status: res.status(), json }
  }

  /** Sign in; returns the access token */
  async token(username: string, password: string): Promise<string> {
    const { status, json } = await this.call<{ accessToken: string }>('POST', '/auth/login', {
      identifier: username,
      password
    })
    expect(status, `sign in as ${username}`).toBe(200)
    return json!.data.accessToken
  }

  async register(username: string, password = STRONG_PASSWORD): Promise<void> {
    const { status, json } = await this.call('POST', '/auth/register', {
      username,
      password,
      church: '愛與話語'
    })
    expect(status, JSON.stringify(json)).toBe(200)
  }

  /** Whether the backend has the admin API (step 2 of the backend plan) */
  async hasAdminApi(adminToken: string): Promise<boolean> {
    const { status } = await this.call('GET', '/admin/users?pageSize=1', undefined, adminToken)
    return status === 200
  }
}

export const test = base.extend<{ api: Api }>({
  api: async ({ request }, use) => use(new Api(request))
})

/** Sign in through the login page and wait for the home page */
export async function signIn(page: Page, username: string, password: string, remember = false) {
  await page.goto('login')
  await page.fill('#login-username', username)
  await page.fill('#login-password', password)
  if (remember) await page.check('#login-remember')
  await page.locator('form.auth-form button[type=submit]').first().click()
  await page.waitForURL((url) => !url.pathname.endsWith('/login'))
}

/** The tokens the page keeps */
export function storedTokens(page: Page) {
  return page.evaluate(() => ({
    access: JSON.parse(localStorage.getItem('superstart_access_token') ?? 'null') as string | null,
    refresh: JSON.parse(localStorage.getItem('superstart_refresh_token') ?? 'null') as string | null
  }))
}
