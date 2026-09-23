import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'

/**
 * Router Guard Unit Tests
 *
 * Tests the guard logic from router/index.ts directly without mounting a real
 * router. The guard returns:
 *   - undefined       → proceed (allow navigation)
 *   - string          → redirect to that path
 *   - { name, query } → redirect to named route
 */

type GuardResult = undefined | string | { name: string; query: Record<string, string> }

// Mirror of the beforeEach guard logic in router/index.ts
function runGuard(
  toPath: string,
  toName: string,
  meta: { requiresAuth?: boolean; guestOnly?: boolean; roles?: string[] },
  authStore: ReturnType<typeof useAuthStore>,
  coursesStore: ReturnType<typeof useCoursesStore>
): GuardResult {
  const to = {
    path: toPath,
    name: toName,
    fullPath: toPath,
    meta,
    matched: [{ meta }]
  }

  const isAuthenticated = authStore.isAuthenticated
  const currentUser = authStore.currentUser

  // 1. Guest-only route
  if (to.matched.some((r) => r.meta.guestOnly)) {
    if (isAuthenticated && currentUser) {
      if (currentUser.role === 'student') return '/student'
      else if (['teacher', 'pastor', 'parent'].includes(currentUser.role)) return '/teacher'
      else return '/admin'
    }
    return undefined
  }

  // 2. Auth check
  if (to.matched.some((r) => r.meta.requiresAuth)) {
    if (!isAuthenticated || !currentUser) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }

    // 3. Admin restrictions
    if (coursesStore.isPageRestricted(currentUser.username, to.path)) {
      return '/unauthorized'
    }

    // 4. Onboarding bypass
    if (to.name === 'Onboarding') return undefined

    // 5. Role check
    const allowedRoles = to.meta.roles as string[] | undefined
    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      return '/unauthorized'
    }
  }

  return undefined
}

describe('Router Guard Logic', () => {
  let authStore: ReturnType<typeof useAuthStore>
  let coursesStore: ReturnType<typeof useCoursesStore>

  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
    authStore = useAuthStore()
    coursesStore = useCoursesStore()
  })

  // ── guestOnly routes ──────────────────────────────────────────────────────

  describe('guestOnly: /login', () => {
    it('allows unauthenticated user to reach /login', () => {
      const result = runGuard('/login', 'Login', { guestOnly: true }, authStore, coursesStore)
      expect(result).toBeUndefined()
    })

    it('redirects logged-in student away from /login to /student', () => {
      authStore.login('student', '123456')
      const result = runGuard('/login', 'Login', { guestOnly: true }, authStore, coursesStore)
      expect(result).toBe('/student')
    })

    it('redirects logged-in teacher away from /login to /teacher', () => {
      authStore.login('teacher', '123456')
      const result = runGuard('/login', 'Login', { guestOnly: true }, authStore, coursesStore)
      expect(result).toBe('/teacher')
    })

    it('redirects logged-in pastor away from /login to /teacher', () => {
      authStore.login('pastor', '123456')
      const result = runGuard('/login', 'Login', { guestOnly: true }, authStore, coursesStore)
      expect(result).toBe('/teacher')
    })

    it('redirects logged-in parent away from /login to /teacher', () => {
      authStore.login('parent', '123456')
      const result = runGuard('/login', 'Login', { guestOnly: true }, authStore, coursesStore)
      expect(result).toBe('/teacher')
    })

    it('redirects logged-in admin away from /login to /admin', () => {
      authStore.login('admin', '123456')
      const result = runGuard('/login', 'Login', { guestOnly: true }, authStore, coursesStore)
      expect(result).toBe('/admin')
    })
  })

  // ── requiresAuth: unauthenticated ─────────────────────────────────────────

  describe('requiresAuth: unauthenticated access', () => {
    it('redirects unauthenticated user to Login with redirect query for /student', () => {
      const result = runGuard(
        '/student', 'StudentDashboard',
        { requiresAuth: true, roles: ['student'] },
        authStore, coursesStore
      )
      expect(result).toEqual({ name: 'Login', query: { redirect: '/student' } })
    })

    it('redirects unauthenticated user to Login for /teacher', () => {
      const result = runGuard(
        '/teacher', 'TeacherDashboard',
        { requiresAuth: true, roles: ['teacher', 'pastor', 'parent'] },
        authStore, coursesStore
      )
      expect(result).toEqual({ name: 'Login', query: { redirect: '/teacher' } })
    })

    it('redirects unauthenticated user to Login for /admin', () => {
      const result = runGuard(
        '/admin', 'AdminDashboard',
        { requiresAuth: true, roles: ['admin'] },
        authStore, coursesStore
      )
      expect(result).toEqual({ name: 'Login', query: { redirect: '/admin' } })
    })
  })

  // ── Role-based access control ─────────────────────────────────────────────

  describe('Role-based access control', () => {
    it('allows student to access /student', () => {
      authStore.login('student', '123456')
      const result = runGuard(
        '/student', 'StudentDashboard',
        { requiresAuth: true, roles: ['student'] },
        authStore, coursesStore
      )
      expect(result).toBeUndefined()
    })

    it('blocks student from /teacher → /unauthorized', () => {
      authStore.login('student', '123456')
      const result = runGuard(
        '/teacher', 'TeacherDashboard',
        { requiresAuth: true, roles: ['teacher', 'pastor', 'parent'] },
        authStore, coursesStore
      )
      expect(result).toBe('/unauthorized')
    })

    it('blocks student from /admin → /unauthorized', () => {
      authStore.login('student', '123456')
      const result = runGuard(
        '/admin', 'AdminDashboard',
        { requiresAuth: true, roles: ['admin'] },
        authStore, coursesStore
      )
      expect(result).toBe('/unauthorized')
    })

    it('allows teacher to access /teacher', () => {
      authStore.login('teacher', '123456')
      const result = runGuard(
        '/teacher', 'TeacherDashboard',
        { requiresAuth: true, roles: ['teacher', 'pastor', 'parent'] },
        authStore, coursesStore
      )
      expect(result).toBeUndefined()
    })

    it('allows pastor to access /teacher (shared role)', () => {
      authStore.login('pastor', '123456')
      const result = runGuard(
        '/teacher', 'TeacherDashboard',
        { requiresAuth: true, roles: ['teacher', 'pastor', 'parent'] },
        authStore, coursesStore
      )
      expect(result).toBeUndefined()
    })

    it('allows parent to access /teacher (shared role)', () => {
      authStore.login('parent', '123456')
      const result = runGuard(
        '/teacher', 'TeacherDashboard',
        { requiresAuth: true, roles: ['teacher', 'pastor', 'parent'] },
        authStore, coursesStore
      )
      expect(result).toBeUndefined()
    })

    it('allows admin to access /admin', () => {
      authStore.login('admin', '123456')
      const result = runGuard(
        '/admin', 'AdminDashboard',
        { requiresAuth: true, roles: ['admin'] },
        authStore, coursesStore
      )
      expect(result).toBeUndefined()
    })

    it('blocks admin from /student → /unauthorized', () => {
      authStore.login('admin', '123456')
      const result = runGuard(
        '/student', 'StudentDashboard',
        { requiresAuth: true, roles: ['student'] },
        authStore, coursesStore
      )
      expect(result).toBe('/unauthorized')
    })

    it('blocks teacher from /admin → /unauthorized', () => {
      authStore.login('teacher', '123456')
      const result = runGuard(
        '/admin', 'AdminDashboard',
        { requiresAuth: true, roles: ['admin'] },
        authStore, coursesStore
      )
      expect(result).toBe('/unauthorized')
    })
  })

  // ── Onboarding special case ───────────────────────────────────────────────

  describe('Onboarding route', () => {
    it('allows any authenticated user to access /onboarding regardless of role', () => {
      authStore.login('student', '123456')
      const result = runGuard(
        '/onboarding', 'Onboarding',
        { requiresAuth: true },
        authStore, coursesStore
      )
      expect(result).toBeUndefined()
    })

    it('blocks unauthenticated user from /onboarding', () => {
      const result = runGuard(
        '/onboarding', 'Onboarding',
        { requiresAuth: true },
        authStore, coursesStore
      )
      expect(result).toEqual({ name: 'Login', query: { redirect: '/onboarding' } })
    })
  })

  // ── Public routes (no meta) ───────────────────────────────────────────────

  describe('Public routes (no meta)', () => {
    it('allows anyone to access /unauthorized', () => {
      const result = runGuard('/unauthorized', 'Unauthorized', {}, authStore, coursesStore)
      expect(result).toBeUndefined()
    })

    it('allows anyone to access /login/callback', () => {
      const result = runGuard('/login/callback', 'LoginCallback', {}, authStore, coursesStore)
      expect(result).toBeUndefined()
    })

    it('allows anyone to access 404 routes', () => {
      const result = runGuard('/some/random/path', 'NotFound', {}, authStore, coursesStore)
      expect(result).toBeUndefined()
    })
  })
})
