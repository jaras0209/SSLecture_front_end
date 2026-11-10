import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import App from '@/App.vue'
import router from '@/router'
import i18n from '@/i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useToastProvider } from '@/composables/useToast'
import type { UserRole } from '@/types/auth'
import { refuseStorageWrites, t } from '@/__tests__/helpers'
import { storageWriteFailed } from '@/utils/storage'
import { flushPersistence } from '@/utils/persist'
import { beginSession, takeSignOutReason } from '@/utils/session'

// Apps share the real router, so each is unmounted after its test
const mounted: { unmount(): void }[] = []

// The real router, so the navbar follows the actual route rules; pages themselves are stubbed
async function mountApp(signIn?: string, prepare: () => void = () => {}) {
  localStorage.clear()
  const pinia = createPinia()
  setActivePinia(pinia)
  useToastProvider().toasts.value = []
  const auth = useAuthStore()
  if (signIn) {
    const u = auth.usersDb[signIn]
    auth.currentUser = {
      username: signIn,
      role: u.role as UserRole,
      loginMethod: 'credentials',
      church: u.church
    }
  }
  prepare()
  await router.replace(signIn ? '/' : '/login')
  const wrapper = mount(App, {
    global: { plugins: [pinia, router, i18n], stubs: { RouterView: true } },
    attachTo: document.body
  })
  mounted.push(wrapper)
  await flushPromises()
  return { wrapper, auth }
}

type Wrapper = Awaited<ReturnType<typeof mountApp>>['wrapper']
const links = (wrapper: Wrapper) => wrapper.findAll('.navbar-link').map((a) => a.attributes('href'))
const body = () => new DOMWrapper(document.body)

describe('App', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.useRealTimers()
    mounted.splice(0).forEach((w) => w.unmount())
  })

  it('shows no navbar to someone signed out', async () => {
    const { wrapper } = await mountApp()
    expect(wrapper.find('nav.navbar').exists()).toBe(false)
  })

  it.each([
    ['student', ['/student']],
    ['teacher', ['/teacher']],
    ['pastor', ['/teacher']],
    ['parent', ['/teacher']],
    ['admin', ['/admin']]
  ])('links %s only to the pages their role may open', async (username, expected) => {
    const { wrapper } = await mountApp(username)
    expect(links(wrapper)).toEqual(expected)
  })

  it('shows who is signed in, their role and church', async () => {
    const { wrapper } = await mountApp('teacher')
    expect(wrapper.find('.username-nav').text()).toBe('teacher')
    expect(wrapper.find('.user-labels').text()).toContain(t('roleLabel.teacher'))
    expect(wrapper.find('.badge-church').text()).toContain('愛與話語')
  })

  it('hides a link the admin has restricted for this user', async () => {
    const { wrapper } = await mountApp('student', () => {
      useCoursesStore().toggleRestriction('student', '/student')
    })
    expect(links(wrapper)).toEqual([])
  })

  it('opens and closes the phone menu, which closes again when the page changes', async () => {
    const { wrapper } = await mountApp('student')
    const burger = wrapper.find('.hamburger-btn')
    expect(burger.attributes('aria-expanded')).toBe('false')
    expect(burger.attributes('aria-controls')).toBe('navbar-collapse')
    expect(burger.attributes('aria-label')).toBe(t('nav.openMenu'))

    await burger.trigger('click')
    expect(burger.attributes('aria-expanded')).toBe('true')
    expect(burger.attributes('aria-label')).toBe(t('nav.closeMenu'))
    expect(wrapper.find('#navbar-collapse').classes()).toContain('is-open')

    await router.push('/unauthorized')
    await flushPromises()
    expect(burger.attributes('aria-expanded')).toBe('false')
  })

  it('signs out and goes to the login page', async () => {
    const { wrapper, auth } = await mountApp('student')
    await wrapper.find('.logout-btn').trigger('click')
    await flushPromises()
    expect(auth.isAuthenticated).toBe(false)
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('offers only the language and signing out while an admin-set password must be replaced', async () => {
    const { wrapper } = await mountApp('student', () => {
      useAuthStore().currentUser!.mustChangePassword = true
    })
    expect(links(wrapper)).toEqual([])
    const buttons = wrapper.findAll('.action-btn').map((b) => b.text())
    expect(buttons.some((l) => l.includes(t('nav.changePassword')))).toBe(false)
    expect(wrapper.find('.logout-btn').exists()).toBe(true)
    expect(wrapper.find('.lang-btn').exists()).toBe(true)
  })

  describe('changing the password', () => {
    async function openModal() {
      const result = await mountApp('student')
      const open = result.wrapper
        .findAll('.action-btn')
        .find((b) => b.text().includes(t('nav.changePassword')))!
      await open.trigger('click')
      return result
    }

    const fill = async (wrapper: Wrapper, old: string, new1: string, new2 = new1) => {
      await wrapper.find('#pwd-old').setValue(old)
      await wrapper.find('#pwd-new').setValue(new1)
      await wrapper.find('#pwd-confirm').setValue(new2)
      await wrapper.find('.modal-card form').trigger('submit')
    }
    const alert = (wrapper: Wrapper) => wrapper.find('.modal-card .alert-box').text()

    it('labels every field', async () => {
      const { wrapper } = await openModal()
      for (const id of ['pwd-old', 'pwd-new', 'pwd-confirm']) {
        expect(wrapper.find(`label[for="${id}"]`).exists(), id).toBe(true)
      }
    })

    it('checks the new password before changing it', async () => {
      const { wrapper } = await openModal()
      await fill(wrapper, '', '')
      expect(alert(wrapper)).toBe(t('profile.errFillAll'))
      await fill(wrapper, '123456', 'Better#2026', 'Better#2027')
      expect(alert(wrapper)).toBe(t('profile.errMismatch'))
      expect(wrapper.find('.pwd-mismatch').exists()).toBe(true)
      await fill(wrapper, '123456', 'abc')
      expect(alert(wrapper)).toBe(t('auth.passwordRules.tooWeak'))
      await fill(wrapper, 'Better#2026', 'Better#2026')
      expect(alert(wrapper)).toBe(t('changePassword.errSame'))
      await fill(wrapper, 'wrong', 'Better#2026')
      expect(alert(wrapper)).toBe(t('stores.auth.wrongOldPassword'))
    })

    it('changes it, says so and closes', async () => {
      vi.useFakeTimers()
      const { wrapper, auth } = await openModal()
      await fill(wrapper, '123456', 'Better#2026')
      expect(auth.usersDb.student.passwordHash).toBe('Better#2026')
      expect(alert(wrapper)).toBe(t('stores.auth.passwordChanged'))
      vi.advanceTimersByTime(1000)
      await flushPromises()
      expect(wrapper.find('.modal-card').exists()).toBe(false)
    })

    it('is not offered to a Google / LINE account, which has no password', async () => {
      const { wrapper } = await mountApp('student', () => {
        useAuthStore().usersDb.student.passwordHash = ''
      })
      const labels = wrapper.findAll('.action-btn').map((b) => b.text())
      expect(labels.some((l) => l.includes(t('nav.changePassword')))).toBe(false)
    })
  })

  describe('signing out after being idle', () => {
    const HOUR = 60 * 60 * 1000

    it('signs out after 2 hours idle, and the login page says why', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
      vi.setSystemTime(new Date('2026-11-10T09:00:00Z'))
      const { auth } = await mountApp('student', () => beginSession(false))

      vi.setSystemTime(new Date(Date.now() + 2 * HOUR - 60_000))
      vi.advanceTimersByTime(60_000) // the minute check
      expect(auth.isAuthenticated).toBe(true)

      vi.setSystemTime(new Date(Date.now() + 2 * 60_000))
      vi.advanceTimersByTime(60_000)
      await flushPromises()
      expect(auth.isAuthenticated).toBe(false)
      expect(router.currentRoute.value.path).toBe('/login')
      expect(takeSignOutReason()).toBe('idle')
    })

    it('counts any activity as use', async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
      vi.setSystemTime(new Date('2026-11-10T09:00:00Z'))
      const { auth } = await mountApp('student', () => beginSession(false))

      vi.setSystemTime(new Date(Date.now() + 1.5 * HOUR))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
      vi.setSystemTime(new Date(Date.now() + 1.5 * HOUR)) // 3 hours in, 1.5 since the last key
      vi.advanceTimersByTime(60_000)
      expect(auth.isAuthenticated).toBe(true)
    })

    it("doesn't let activity after the limit revive the sign-in", async () => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
      vi.setSystemTime(new Date('2026-11-10T09:00:00Z'))
      const { auth } = await mountApp('student', () => beginSession(false))

      // e.g. a laptop woken up hours later: the first click signs out rather than counts
      vi.setSystemTime(new Date(Date.now() + 3 * HOUR))
      window.dispatchEvent(new Event('pointerdown'))
      await flushPromises()
      expect(auth.isAuthenticated).toBe(false)
      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('a sign-in or sign-out in another tab', () => {
    it('follows someone signing in elsewhere to their home page', async () => {
      const { auth } = await mountApp()
      auth.currentUser = { username: 'admin', role: 'admin', loginMethod: 'credentials' }
      auth.sessionChangedElsewhere++
      // the page is loaded on demand, so the navigation takes a moment
      await vi.waitFor(() => expect(router.currentRoute.value.path).toBe('/admin'))
    })

    it('leaves a signed-in page for the login page when signed out elsewhere', async () => {
      const { auth } = await mountApp('student')
      await router.push('/student')
      auth.currentUser = null
      auth.sessionChangedElsewhere++
      await flushPromises()
      expect(router.currentRoute.value.path).toBe('/login')
    })
  })

  describe('when the browser refuses to save', () => {
    beforeEach(() => {
      storageWriteFailed.value = false
    })
    afterEach(() => {
      vi.restoreAllMocks()
      vi.unstubAllGlobals()
      storageWriteFailed.value = false
    })

    it('warns that the change was not saved, until dismissed', async () => {
      const { wrapper } = await mountApp('student')
      expect(wrapper.find('.storage-warning').exists()).toBe(false)

      vi.spyOn(console, 'warn').mockImplementation(() => {})
      refuseStorageWrites()
      const courses = useCoursesStore()
      courses.addListenSession('student', courses.courses[0].id, {
        lecturer: '',
        listenedAt: '2026-03-01T19:30',
        notes: '寫好的心得'
      })
      await flushPromises() // the store's watcher schedules the write
      flushPersistence()
      await flushPromises()

      const warning = wrapper.find('.storage-warning')
      expect(warning.attributes('role')).toBe('alert')
      expect(warning.text()).toContain(t('storage.writeFailedTitle'))
      await warning.find('button').trigger('click')
      expect(wrapper.find('.storage-warning').exists()).toBe(false)
    })
  })

  it('renders the toasts', async () => {
    await mountApp()
    useToastProvider().toasts.value.push({ id: 1, text: '已儲存', type: 'success' })
    await flushPromises()
    expect(body().find('.toast-item.toast-success').text()).toBe('已儲存')
  })
})
