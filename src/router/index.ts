import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { homeRouteFor } from '@/router/homeRoute'
import { scrollMotion } from '@/utils/motion'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: () => homeRouteFor(useAuthStore().currentUser?.role)
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { guestOnly: true }
  },
  {
    path: '/student',
    name: 'StudentDashboard',
    component: () => import('@/views/StudentDashboard.vue'),
    meta: { requiresAuth: true, roles: ['student'] }
  },
  {
    path: '/teacher',
    name: 'TeacherDashboard',
    component: () => import('@/views/TeacherDashboard.vue'),
    meta: { requiresAuth: true, roles: ['teacher', 'pastor', 'parent'] }
  },
  {
    path: '/admin',
    name: 'AdminDashboard',
    component: () => import('@/views/AdminDashboard.vue'),
    meta: { requiresAuth: true, roles: ['admin'] }
  },
  {
    path: '/login/callback',
    name: 'LoginCallback',
    component: () => import('@/views/LoginCallback.vue')
    // 不設 guestOnly / requiresAuth：callback 是 OAuth 中間狀態頁
  },
  {
    path: '/onboarding',
    name: 'Onboarding',
    component: () => import('@/views/OnboardingView.vue'),
    meta: { requiresAuth: true } // 需有 token，但 church 可為空
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: () => import('@/views/ChangePasswordView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/unauthorized',
    name: 'Unauthorized',
    component: () => import('@/views/UnauthorizedView.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/NotFoundView.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (to, from, savedPosition) => pageScroll(to.path, from.path, savedPosition)
})

/**
 * Where to scroll after a navigation: Back / Forward return to where the user was; a new page
 * starts at the top; staying on the same page (only the query or hash changed) doesn't jump
 */
export function pageScroll(
  toPath: string,
  fromPath: string,
  savedPosition: { left: number; top: number } | null
) {
  if (savedPosition) return tallEnoughFor(savedPosition.top).then(() => savedPosition)
  if (toPath === fromPath) return false
  return { top: 0, behavior: scrollMotion() }
}

/**
 * Resolve once the page is tall enough to scroll to `top` (parts of it are still rendering
 * when Back brings it up, so restoring at once would stop short), or after `timeoutMs`
 */
export function tallEnoughFor(top: number, timeoutMs = 1000): Promise<void> {
  const start = performance.now()
  return new Promise((resolve) => {
    const check = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight
      if (room >= top || performance.now() - start >= timeoutMs) resolve()
      else requestAnimationFrame(check)
    }
    check()
  })
}

// Navigation Guard
router.beforeEach((to, _from) => {
  const authStore = useAuthStore()
  const coursesStore = useCoursesStore()

  const isAuthenticated = authStore.isAuthenticated
  const currentUser = authStore.currentUser

  // 0. An admin set this password (new account or reset): replace it before anything else
  if (currentUser?.mustChangePassword && to.name !== 'ChangePassword') {
    return { name: 'ChangePassword' }
  }

  // 1. Guest-only route check (e.g., Login page should not be accessed if logged in)
  if (to.matched.some((record) => record.meta.guestOnly)) {
    if (isAuthenticated && currentUser) {
      return homeRouteFor(currentUser.role)
    }
    return
  }

  // 2. Auth checking
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    if (!isAuthenticated || !currentUser) {
      // Redirect to login if not logged in
      return { name: 'Login', query: { redirect: to.fullPath } }
    }

    // 3. Admin restrictions checking
    // Check if admin has restricted this specific path for the user
    if (coursesStore.isPageRestricted(currentUser.username, to.path)) {
      return '/unauthorized'
    }

    // 4. Role checking
    // Onboarding 頁允許尚未填寫 church 的 OAuth 新使用者進入（不做 role 和 church 檢查）
    if (to.name === 'Onboarding') {
      return
    }

    const allowedRoles = to.meta.roles as string[] | undefined
    if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
      return '/unauthorized'
    }
  }
})

export default router
