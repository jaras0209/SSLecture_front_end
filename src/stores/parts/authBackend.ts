/**
 * @file src/stores/parts/authBackend.ts
 * @description 登入、註冊、登出、修改密碼、個人資料：呼叫後端的版本（usesBackend() 時，見 utils/backendMode.ts）。
 *
 * 端點與欄位見 docs/backend_api_spec.md 第 2 節。Token 存在 localStorage（各分頁共用），由 utils/api.ts 帶入與換發；
 * 帳號資料以後端的 `GET /auth/me` 為準，不存在瀏覽器的帳號清單裡（後者只在示範模式使用）。
 */
import type { Gender, LoginMethod, User, UserRole } from '@/types/auth'
import { ApiError, apiGet, apiPatch, apiPost, clearTokens, saveTokens } from '@/utils/api'
import { defaultAvatarUrl } from '@/utils/avatar'
import { translate as t } from '@/i18n'

/** What the store's actions return: whether it worked, and what to tell the user */
export interface AuthResult {
  success: boolean
  message: string
}

/** `GET` / `PATCH /auth/me` */
export interface MeResponse {
  id: string
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
  createdAt?: string | null
}

/** `POST /auth/login`, `POST /auth/refresh` */
export interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

/** The signed-in user as the app keeps it, from the backend's account */
export function userFromMe(me: MeResponse): User {
  return {
    username: me.username,
    role: me.role,
    loginMethod: me.loginMethod,
    avatarUrl: me.avatarUrl || defaultAvatarUrl(me.username),
    church: me.church ?? undefined,
    childUsernames: me.role === 'parent' ? (me.childUsernames ?? []) : undefined,
    displayName: me.displayName ?? undefined,
    realName: me.realName ?? undefined,
    email: me.email ?? undefined,
    gender: me.gender ?? undefined,
    lastLoginAt: me.lastLoginAt ?? undefined,
    mustChangePassword: me.mustChangePassword || undefined
  }
}

/** A failed call as a result for the user; anything unexpected is rethrown */
function failed(err: unknown): AuthResult {
  if (err instanceof ApiError) return { success: false, message: err.message }
  throw err
}

export async function backendLogin(
  identifier: string,
  password: string,
  remember: boolean
): Promise<{ result: AuthResult; user?: User }> {
  try {
    const tokens = await apiPost<TokenResponse>(
      '/auth/login',
      { identifier: identifier.trim(), password, rememberMe: remember },
      { skipAuth: true }
    )
    saveTokens(tokens.accessToken, tokens.refreshToken)
    const user = userFromMe(await apiGet<MeResponse>('/auth/me'))
    const message = user.mustChangePassword
      ? t('stores.auth.loginMustChangePassword')
      : t('stores.auth.loginSuccess')
    return { result: { success: true, message }, user }
  } catch (err) {
    clearTokens()
    return { result: failed(err) }
  }
}

/** Register, then sign in with the new account (the API's register returns no tokens) */
export async function backendRegister(account: {
  username: string
  password: string
  church?: string
  email?: string
  inviteCode?: string
}): Promise<{ result: AuthResult; user?: User }> {
  try {
    await apiPost(
      '/auth/register',
      {
        username: account.username.trim(),
        password: account.password,
        church: account.church || undefined,
        email: account.email?.trim() || undefined,
        inviteCode: account.inviteCode?.trim() || undefined
      },
      { skipAuth: true }
    )
  } catch (err) {
    return { result: failed(err) }
  }
  const signedIn = await backendLogin(account.username, account.password, false)
  if (!signedIn.result.success) return signedIn
  return {
    result: { success: true, message: t('stores.auth.registerSuccess') },
    user: signedIn.user
  }
}

/** End this sign-in on the server too; signed out here whatever it answers */
export async function backendLogout(): Promise<void> {
  try {
    await apiPost('/auth/logout')
  } catch {
    /* already expired, or the server can't be reached: the tokens are dropped below anyway */
  } finally {
    clearTokens()
  }
}

export async function backendChangePassword(
  oldPassword: string,
  newPassword: string
): Promise<{ result: AuthResult; user?: User }> {
  try {
    await apiPost('/auth/reset-password', { oldPassword, newPassword })
    const user = userFromMe(await apiGet<MeResponse>('/auth/me'))
    return { result: { success: true, message: t('stores.auth.passwordChanged') }, user }
  } catch (err) {
    return { result: failed(err) }
  }
}

export async function backendUpdateProfile(patch: {
  displayName?: string
  realName?: string
  avatarUrl?: string
  email?: string
}): Promise<{ result: AuthResult; user?: User }> {
  try {
    const user = userFromMe(await apiPatch<MeResponse>('/auth/me', patch))
    return { result: { success: true, message: t('stores.auth.profileUpdated') }, user }
  } catch (err) {
    return { result: failed(err) }
  }
}

/** The signed-in account as the server has it now (role, profile may have changed elsewhere) */
export async function backendCurrentUser(): Promise<User | undefined> {
  try {
    return userFromMe(await apiGet<MeResponse>('/auth/me'))
  } catch (err) {
    if (err instanceof ApiError) return undefined
    throw err
  }
}
