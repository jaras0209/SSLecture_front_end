import { describe, it, expect, afterEach } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { mount, flushPromises } from '@vue/test-utils'
import appRouter from '@/router'
import i18n, { setLocale } from '@/i18n'
import { usePageTitle, APP_NAME } from '@/composables/usePageTitle'
import { t } from '@/__tests__/helpers'

// The app's named routes, each with a placeholder page
const names = appRouter
  .getRoutes()
  .map((r) => r.name)
  .filter((n): n is string => typeof n === 'string')

function mountTitled() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: names.map((name, i) => ({ name, path: `/${i}`, component: { render: () => null } }))
  })
  const Host = defineComponent({
    setup() {
      usePageTitle()
      return () => h('div')
    }
  })
  mount(Host, { global: { plugins: [router, i18n] } })
  return router
}

describe('usePageTitle', () => {
  afterEach(async () => {
    await setLocale('zh-TW')
  })

  it('shows the full app name until a page is known', async () => {
    mountTitled()
    await nextTick()
    expect(document.title).toBe(`${APP_NAME} - ${t('pageTitle.app')}`)
  })

  it('names the page, and follows navigation', async () => {
    const router = mountTitled()
    await router.push({ name: 'StudentDashboard' })
    await flushPromises()
    expect(document.title).toBe(`${t('pageTitle.student')} - ${APP_NAME}`)
    await router.push({ name: 'NotFound', params: { pathMatch: ['x'] } })
    await flushPromises()
    expect(document.title).toBe(`${t('pageTitle.notFound')} - ${APP_NAME}`)
  })

  it('follows a change of language', async () => {
    const router = mountTitled()
    await router.push({ name: 'Login' })
    await flushPromises()
    expect(document.title).toBe(`登入 - ${APP_NAME}`)
    await setLocale('en')
    await nextTick()
    expect(document.title).toBe(`Sign In - ${APP_NAME}`)
    expect(i18n.global.t('pageTitle.login')).toBe('Sign In')
  })

  it('gives every named page in the app its own title', async () => {
    expect(names.length).toBeGreaterThanOrEqual(9)
    const router = mountTitled()
    const seen = new Set<string>()
    for (const name of names) {
      await router.push({ name, params: name === 'NotFound' ? { pathMatch: ['x'] } : {} })
      await flushPromises()
      expect(document.title, name).not.toContain(t('pageTitle.app'))
      seen.add(document.title)
    }
    expect(seen.size).toBe(names.length)
  })
})
