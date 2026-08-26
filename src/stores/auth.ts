import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { safeGet, safeSet, safeRemove } from '@/utils/storage'
import { i18n } from '@/i18n'
// Store-level t() wrapper — 在 store 函式被呼叫時（i18n 已就緒）才執行翻譯
const t = (key: string, values?: Record<string, unknown>): string =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (i18n.global.t as any)(key, values ?? {}) as string

// 後端就緒後，在 exchangeOAuthCode / completeProfile 中：
// 移除 mock 區塊，改用 src/utils/api.ts 的 apiPost / apiPut 取代 fetch 呼叫

// 型別定義集中至 src/types/auth.ts—從這裡 re-export 保持向下相容
export type {
  UserRole,
  LoginMethod,
  User,
  InviteCode,
  Church
} from '@/types/auth'
export { CHURCHES, DEFAULT_RESET_PASSWORD } from '@/types/auth'

// 引入型別供 store 內部使用
import type { UserRole, User, InviteCode } from '@/types/auth'
import { DEFAULT_RESET_PASSWORD } from '@/types/auth'

/** 邀請碼前綴（用於產生易讀的邀請碼） */
const ROLE_CODE_PREFIX: Record<UserRole, string> = {
  student: 'STU',
  teacher: 'TCH',
  pastor: 'PST',
  parent: 'PAR',
  admin: 'ADM'
}


export const useAuthStore = defineStore('auth', () => {
  // Load initial state from LocalStorage if available
  const currentUser = ref<User | null>(
    safeGet<User | null>('superstart_user', null, { clearOnError: true })
  )
  // Derived synchronously — always matches currentUser
  const isAuthenticated = computed<boolean>(() => currentUser.value !== null)
  const isAuthenticating = ref<boolean>(false)

  // Pre-configured mock accounts database
  const usersDb = ref<Record<string, {
    passwordHash: string
    role: UserRole
    church?: string
    childUsernames?: string[]
    displayName?: string
    realName?: string
    lastLoginAt?: string
    avatarUrl?: string
  }>>({
    student: { passwordHash: '123456', role: 'student', church: '愛與話語' },
    teacher: { passwordHash: '123456', role: 'teacher', church: '愛與話語' },
    admin: { passwordHash: '123456', role: 'admin' },
    parent: { passwordHash: '123456', role: 'parent', church: '愛與話語', childUsernames: ['student'] },
    pastor: { passwordHash: '123456', role: 'pastor', church: '愛與話語' }
  })


  // Load registered users from localStorage if exists
  const savedDb = safeGet<typeof usersDb.value>(
    'superstart_users_db',
    {},
    { clearOnError: true }
  )
  if (Object.keys(savedDb).length > 0) {
    // Merge to preserve default mock accounts while applying saved data
    usersDb.value = { ...usersDb.value, ...savedDb }
  }

  // Migrate old accounts: add default church if missing
  Object.keys(usersDb.value).forEach(username => {
    const user = usersDb.value[username]
    if (user.role !== 'admin' && !user.church) {
      user.church = '愛與話語'
    }
  })

  // Watchers to persist state
  watch(currentUser, (newUser) => {
    if (newUser) {
      safeSet('superstart_user', newUser)
    } else {
      safeRemove('superstart_user')
    }
  })

  watch(usersDb, (newDb) => {
    safeSet('superstart_users_db', newDb)
  }, { deep: true })

  // ── Invite Codes DB ──────────────────────────────────────────────────────────

  const inviteCodesDb = ref<Record<string, InviteCode>>(
    safeGet<Record<string, InviteCode>>('superstart_invite_codes', {}, { clearOnError: true })
  )

  watch(inviteCodesDb, (newCodes) => {
    safeSet('superstart_invite_codes', newCodes)
  }, { deep: true })

  // Actions
  function login(username: string, passwordHash: string): { success: boolean; message: string } {
    const user = usersDb.value[username]
    if (!user) {
      return { success: false, message: t('stores.auth.accountNotFound') }
    }
    if (user.passwordHash !== passwordHash) {
      return { success: false, message: t('stores.auth.wrongPassword') }
    }
    
    const now = new Date().toLocaleString('zh-TW', { hour12: false })
    // Save last login time
    usersDb.value[username].lastLoginAt = now

    currentUser.value = {
      username,
      role: user.role,
      loginMethod: 'credentials',
      avatarUrl: user.avatarUrl || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}`,
      church: user.church,
      childUsernames: user.childUsernames,
      displayName: user.displayName,
      realName: user.realName,
      lastLoginAt: now
    }
    return { success: true, message: t('stores.auth.loginSuccess') }
  }

  function register(
    username: string,
    passwordHash: string,
    role: UserRole,
    church?: string,
    childUsernames?: string[]
  ): { success: boolean; message: string } {
    if (usersDb.value[username]) {
      return { success: false, message: t('stores.auth.usernameTaken') }
    }
    
    usersDb.value[username] = {
      passwordHash,
      role,
      church: role === 'admin' ? undefined : (church || '愛與話語'),
      childUsernames: role === 'parent' ? (childUsernames || []) : undefined
    }

    currentUser.value = {
      username,
      role,
      loginMethod: 'credentials',
      avatarUrl: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}`,
      church: role === 'admin' ? undefined : (church || '愛與話語'),
      childUsernames: role === 'parent' ? (childUsernames || []) : undefined
    }
    return { success: true, message: t('stores.auth.registerSuccess') }
  }



  /**
   * 用短效一次性 code 換取 JWT。
   * OAuth2 授權成功後，後端 Redirect 到 /login/callback?code=XXX，
   * 前端再呼叫此函式換取真正的 JWT。
   *
   * TODO（後端就緒後）：
   *   1. 移除下方「=== 開發期 mock ===」區塊
   *   2. 取消註解 fetch 呼叫區塊（已預先寫好，被 TODO 包圈）
   *   3. 確認 safeSet token 和 currentUser.value 欄位對應
   */
  async function exchangeOAuthCode(
    _code: string
  ): Promise<{ success: boolean; needsOnboarding: boolean; message: string }> {
    // TODO: 後端就緒後，移除 mock，取消註解以下 fetch 呼叫
    // try {
    //   const res = await fetch(`${API_BASE}/auth/exchange`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({ code })
    //   })
    //   const data = await res.json()
    //   if (!data.success) return { success: false, needsOnboarding: false, message: data.error?.message ?? '登入失敗' }
    //   safeSet('superstart_access_token', data.data.accessToken)
    //   safeSet('superstart_refresh_token', data.data.refreshToken)
    //   currentUser.value = data.data.user
    //   return { success: true, needsOnboarding: data.data.needsOnboarding, message: 'ok' }
    // } catch (err) {
    //   return { success: false, needsOnboarding: false, message: '網路錯誤，請稍後再試' }
    // }

    // === 開發期 mock（後端就緒後移除）===
    console.warn('[AUTH] exchangeOAuthCode: Using dev mock — 後端就緒後請替換為真實 API 呼叫')
    isAuthenticating.value = true
    await new Promise(r => setTimeout(r, 1000))
    isAuthenticating.value = false
    currentUser.value = {
      username: `oauth_${Date.now()}`,
      role: 'student',
      loginMethod: 'google',
      church: undefined,
      displayName: 'OAuth 測試使用者',
      avatarUrl: 'https://cdn-icons-png.flaticon.com/512/300/300221.png'
    }
    return { success: true, needsOnboarding: true, message: 'ok' }
  }

  /**
   * 首次社群登入後，補充所屬教會、username、邀請碼。
   *
   * TODO（後端就緒後）：
   *   1. 移除下方「=== 開發期 mock ===」區塊
   *   2. 取消註解 fetch PUT /auth/complete-profile 呼叫區塊
   *   3. 成功後更新 currentUser.value 為後端回傳的最新使用者資料
   */
  async function completeProfile(payload: {
    churchId: string
    username?: string
    inviteCode?: string
  }): Promise<{ success: boolean; message: string }> {
    // TODO: 後端就緒後，移除 mock，取消註解以下 fetch 呼叫
    // try {
    //   const token = safeGet<string>('superstart_access_token', '')
    //   const res = await fetch(`${API_BASE}/auth/complete-profile`, {
    //     method: 'PUT',
    //     headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    //     body: JSON.stringify(payload)
    //   })
    //   const data = await res.json()
    //   if (data.success) currentUser.value = data.data.user
    //   return { success: data.success, message: data.error?.message ?? '完成' }
    // } catch (err) {
    //   return { success: false, message: '網路錯誤，請稍後再試' }
    // }

    // === 開發期 mock（後端就緒後移除）===
    console.warn('[AUTH] completeProfile: Using dev mock — 後端就緒後請替換為真實 API 呼叫')
    if (!currentUser.value) return { success: false, message: t('stores.auth.notLoggedIn') }
    if (payload.inviteCode) {
      const invite = validateInviteCode(payload.inviteCode)
      if (invite) {
        currentUser.value = {
          ...currentUser.value,
          role: invite.role,
          church: payload.churchId,
          username: payload.username || currentUser.value.username
        }
        consumeInviteCode(payload.inviteCode, currentUser.value.username)
      } else {
        return { success: false, message: t('stores.auth.invalidInviteCode') }
      }
    } else {
      currentUser.value = {
        ...currentUser.value,
        church: payload.churchId,
        username: payload.username || currentUser.value.username
      }
    }
    return { success: true, message: t('stores.auth.profileComplete') }
  }

  function logout() {
    currentUser.value = null
  }

  function updatePassword(username: string, oldPasswordHash: string, newPasswordHash: string): { success: boolean; message: string } {
    const user = usersDb.value[username]
    if (!user) {
      return { success: false, message: t('stores.auth.accountNotFoundShort') }
    }
    if (user.passwordHash !== oldPasswordHash) {
      return { success: false, message: t('stores.auth.wrongOldPassword') }
    }
    user.passwordHash = newPasswordHash
    return { success: true, message: t('stores.auth.passwordChanged') }
  }

  /**
   * Admin-only: reset any user's password to the default value.
   * In production this would trigger an email with a reset link instead.
   */
  function adminResetPassword(username: string): { success: boolean; message: string } {
    const user = usersDb.value[username]
    if (!user) {
      return { success: false, message: t('stores.auth.accountNotFoundShort') }
    }
    user.passwordHash = DEFAULT_RESET_PASSWORD
    return { success: true, message: t('stores.auth.passwordReset', { username }) }
  }

  /**
   * Update profile (displayName and/or avatarUrl).
   * Syncs both currentUser and usersDb for persistence.
   */
  function updateProfile(
    username: string,
    patch: { displayName?: string; realName?: string; avatarUrl?: string }
  ): { success: boolean; message: string } {
    const dbUser = usersDb.value[username]
    if (!dbUser) {
      return { success: false, message: '找不到此帳號。' }
    }
    if (patch.displayName !== undefined) {
      dbUser.displayName = patch.displayName.trim() || undefined
    }
    if (patch.realName !== undefined) {
      dbUser.realName = patch.realName.trim() || undefined
    }
    if (patch.avatarUrl !== undefined) {
      dbUser.avatarUrl = patch.avatarUrl
    }
    // Sync into currentUser if it's the same person
    if (currentUser.value && currentUser.value.username === username) {
      currentUser.value = {
        ...currentUser.value,
        displayName: dbUser.displayName,
        realName: dbUser.realName,
        avatarUrl: dbUser.avatarUrl || currentUser.value.avatarUrl
      }
    }
    return { success: true, message: t('stores.auth.profileUpdated') }
  }

  // ── Invite Code Actions ───────────────────────────────────────────────────────

  /**
   * Generate a one-time invite code for a specific role.
   * Format: SS-{ROLE_PREFIX}-{4 random uppercase hex chars}
   */
  function generateInviteCode(
    role: UserRole,
    church: string | undefined,
    createdBy: string,
    expiryDays = 7
  ): string {
    const prefix = ROLE_CODE_PREFIX[role]
    const rand = Math.random().toString(16).substring(2, 6).toUpperCase()
    const code = `SS-${prefix}-${rand}`
    const now = new Date()
    const expires = new Date(now.getTime() + expiryDays * 86400000)
    inviteCodesDb.value[code] = {
      code,
      role,
      church: role === 'admin' ? undefined : church,
      createdBy,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      revoked: false
    }
    return code
  }

  /**
   * Validate an invite code. Returns the InviteCode if valid, null otherwise.
   */
  function validateInviteCode(code: string): InviteCode | null {
    const invite = inviteCodesDb.value[code.toUpperCase()]
    if (!invite) return null
    if (invite.revoked) return null
    if (invite.usedBy) return null
    if (new Date() > new Date(invite.expiresAt)) return null
    return invite
  }

  /**
   * Mark an invite code as used after successful registration.
   */
  function consumeInviteCode(code: string, username: string): void {
    const invite = inviteCodesDb.value[code.toUpperCase()]
    if (!invite) return
    invite.usedBy = username
    invite.usedAt = new Date().toISOString()
  }

  /**
   * Admin: revoke (invalidate) an invite code that hasn't been used yet.
   */
  function revokeInviteCode(code: string): { success: boolean; message: string } {
    const invite = inviteCodesDb.value[code.toUpperCase()]
    if (!invite) return { success: false, message: '找不到此邀請碼。' }
    if (invite.usedBy) return { success: false, message: '此邀請碼已被使用，無法作廢。' }
    invite.revoked = true
    return { success: true, message: `邀請碼 ${code} 已作廢。` }
  }

  /**
   * Get all invite codes (for Admin dashboard display).
   */
  function getInviteCodes(): InviteCode[] {
    return Object.values(inviteCodesDb.value).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  return {
    currentUser,
    isAuthenticated,
    isAuthenticating,
    usersDb,
    inviteCodesDb,
    login,
    register,
    exchangeOAuthCode,
    completeProfile,
    logout,
    updatePassword,
    adminResetPassword,
    updateProfile,
    generateInviteCode,
    validateInviteCode,
    consumeInviteCode,
    revokeInviteCode,
    getInviteCodes
  }
})
