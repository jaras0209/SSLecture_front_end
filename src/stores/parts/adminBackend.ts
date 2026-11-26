/**
 * @file src/stores/parts/adminBackend.ts
 * @description 管理員的帳號與邀請碼：呼叫後端的版本（usesBackend() 時，見 utils/backendMode.ts）。
 *
 * 端點見 docs/backend_api_spec.md 第 8 節。後端的回應換成前端原本的形狀（`usersDb` 的帳號、`InviteCode`），
 * 由 auth store 放進同一份資料，所以其他頁面（教會概況、教學統計等）也看到伺服器上的帳號。
 */
import type { Gender, InviteCode, LoginMethod, UserRole } from '@/types/auth'
import { apiDelete, apiGet, apiPost, apiPut } from '@/utils/api'

/** `GET /admin/users` 的一筆 */
export interface AdminUser {
  username: string
  role: UserRole
  church?: string | null
  displayName?: string | null
  realName?: string | null
  email?: string | null
  gender?: Gender | null
  avatarUrl?: string | null
  loginMethod: LoginMethod
  mustChangePassword: boolean
  childUsernames?: string[] | null
  lastLoginAt?: string | null
}

/** 刪除帳號或改角色時清理的筆數 */
export interface CleanupCounts {
  mentorAssignments: number
  lecturerLinks: number
  cancelledBookings: number
}

interface Page<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

interface InviteCodeView {
  code: string
  role: UserRole
  church?: string | null
  createdBy?: string | null
  createdAt: string
  expiresAt: string
  usedBy?: string | null
  usedAt?: string | null
  revoked: boolean
}

/** The largest page the API returns */
const PAGE_SIZE = 500

/** Every active account, page by page */
export async function fetchAccounts(): Promise<AdminUser[]> {
  const all: AdminUser[] = []
  for (let page = 1; ; page++) {
    const result = await apiGet<Page<AdminUser>>(`/admin/users?page=${page}&pageSize=${PAGE_SIZE}`)
    all.push(...result.items)
    if (all.length >= result.total || result.items.length === 0) return all
  }
}

/** An account as the app keeps it (no password: the server keeps that) */
export function accountRecord(u: AdminUser) {
  return {
    passwordHash: '',
    role: u.role,
    church: u.church ?? undefined,
    childUsernames: u.role === 'parent' ? (u.childUsernames ?? []) : undefined,
    displayName: u.displayName ?? undefined,
    realName: u.realName ?? undefined,
    email: u.email ?? undefined,
    gender: u.gender ?? undefined,
    avatarUrl: u.avatarUrl ?? undefined,
    loginMethod: u.loginMethod,
    mustChangePassword: u.mustChangePassword || undefined,
    lastLoginAt: u.lastLoginAt ?? undefined
  }
}

export function createAccountOnServer(account: {
  username: string
  password: string
  role: UserRole
  church?: string
  email?: string
}): Promise<AdminUser> {
  return apiPost<AdminUser>('/admin/users', {
    username: account.username.trim(),
    password: account.password,
    role: account.role,
    church: account.role === 'admin' ? undefined : account.church,
    email: account.email?.trim() || undefined
  })
}

export function updateAccountOnServer(
  username: string,
  patch: { role?: UserRole; gender?: Gender | ''; password?: string; displayName?: string }
): Promise<{ user: AdminUser; cleanup: CleanupCounts }> {
  return apiPut(`/admin/users/${encodeURIComponent(username)}`, patch)
}

export function deleteAccountOnServer(
  username: string
): Promise<{ username: string; cleanup: CleanupCounts }> {
  return apiDelete(`/admin/users/${encodeURIComponent(username)}`)
}

/** Every invite code, as the app keeps them */
export async function fetchInviteCodes(): Promise<Record<string, InviteCode>> {
  const codes = await apiGet<InviteCodeView[]>('/admin/invite-codes')
  return Object.fromEntries(
    codes.map((c) => [
      c.code,
      {
        code: c.code,
        role: c.role,
        church: c.church ?? undefined,
        createdBy: c.createdBy ?? '',
        createdAt: c.createdAt,
        expiresAt: c.expiresAt,
        usedBy: c.usedBy ?? undefined,
        usedAt: c.usedAt ?? undefined,
        revoked: c.revoked
      } satisfies InviteCode
    ])
  )
}

export function createInviteCodeOnServer(
  role: UserRole,
  church: string | undefined,
  expiryDays: number
): Promise<{ code: string; expiresAt: string }> {
  return apiPost('/admin/invite-codes', { role, church, expiryDays })
}

export function revokeInviteCodeOnServer(code: string): Promise<void> {
  return apiDelete(`/admin/invite-codes/${encodeURIComponent(code)}`)
}
