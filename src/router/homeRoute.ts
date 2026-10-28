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
