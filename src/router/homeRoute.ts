import type { Router } from 'vue-router'
import type { UserRole } from '@/types/auth'

/** 各角色登入後的首頁。以 Record 定義，新增角色時 TypeScript 會要求補上對應頁面。 */
const HOME_ROUTES: Record<UserRole, string> = {
  student: '/student',
  teacher: '/teacher',
  pastor: '/teacher',
  parent: '/teacher',
  admin: '/admin'
}

/** 依角色取得首頁路徑；未登入（無角色）時回到登入頁。 */
export function homeRouteFor(role: UserRole | undefined): string {
  return role ? HOME_ROUTES[role] : '/login'
}

// Pages that make no sense to come back to after signing in
const NOT_A_DESTINATION = new Set(['Login', 'LoginCallback', 'NotFound', 'Unauthorized'])

/**
 * 登入後要回到的頁面：路由守衛把未登入的訪客導到 `/login?redirect=...` 時記下的原頁面。
 * 只接受本站路徑（防止被利用成轉址到其他網站），且必須是這個角色能開的頁面；
 * 否則回傳 undefined，由呼叫端回到首頁。
 */
export function afterLoginRoute(
  redirect: unknown,
  role: UserRole,
  router: Router
): string | undefined {
  // Only same-site paths: no "//other.site", no "https://...", no backslash tricks
  if (typeof redirect !== 'string' || !/^\/(?![/\\])/.test(redirect) || redirect.includes('\\')) {
    return undefined
  }
  const target = router.resolve(redirect)
  if (!target.matched.length || NOT_A_DESTINATION.has(String(target.name))) return undefined
  const roles = target.meta.roles as string[] | undefined
  if (roles && !roles.includes(role)) return undefined
  return target.fullPath
}
