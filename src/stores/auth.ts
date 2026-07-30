import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { safeGet, safeSet, safeRemove } from '@/utils/storage'

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent' | 'pastor'

/** Mock 環境下的預設重設密碼（未來串接後端時由後端發送 Email 重設連結取代） */
export const DEFAULT_RESET_PASSWORD = '123456'

/** 邀請碼前綴（用於產生易讀的邀請碼） */
const ROLE_CODE_PREFIX: Record<UserRole, string> = {
  student: 'STU',
  teacher: 'TCH',
  pastor: 'PST',
  parent: 'PAR',
  admin: 'ADM'
}

export interface InviteCode {
  code: string          // e.g. "SS-TCH-A3F7"
  role: UserRole        // 指定註冊角色
  church?: string       // 指定教會（admin 可為空）
  createdBy: string     // 產生者 username
  createdAt: string     // 產生時間
  expiresAt: string     // 到期時間
  usedBy?: string       // 使用者 username（使用後填入）
  usedAt?: string       // 使用時間
  revoked?: boolean     // 是否已作廢
}

export const CHURCHES = [
  '愛與話語', '主大明', '主勝利', '主生命', '主和睦光',
  '台北主話語', '聖靈', '永明', '主希望光', '實踐',
  '主愛', '主大永', '主磐石', '信主', '宜蘭主話語',
  '天民', '主幸福', '信榮', '主盼望'
] as const

export interface User {
  username: string
  role: UserRole
  loginMethod: 'credentials' | 'google' | 'line'
  avatarUrl?: string
  church?: string
  childUsernames?: string[]
  displayName?: string   // 暱稱（未設定時顯示 username）
  realName?: string      // 真實姓名（管理端顯示用）
  lastLoginAt?: string   // 上次登入時間
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
      return { success: false, message: '找不到此帳號，請先註冊。' }
    }
    if (user.passwordHash !== passwordHash) {
      return { success: false, message: '密碼錯誤，請再試一次。' }
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
    return { success: true, message: '登入成功！' }
  }

  function register(
    username: string,
    passwordHash: string,
    role: UserRole,
    church?: string,
    childUsernames?: string[]
  ): { success: boolean; message: string } {
    if (usersDb.value[username]) {
      return { success: false, message: '帳號已被使用，請更換名稱。' }
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
    return { success: true, message: '註冊成功！' }
  }

  // Mock third-party logins with short simulated latency
  async function loginWithThirdParty(
    method: 'google' | 'line',
    customRole: UserRole = 'student',
    church?: string,
    childUsernames?: string[]
  ): Promise<void> {
    isAuthenticating.value = true
    await new Promise((resolve) => setTimeout(resolve, 1500))
    
    const randomSuffix = Math.floor(Math.random() * 900) + 100
    const username = method === 'google' 
      ? `GoogleSS學員_${randomSuffix}` 
      : `LineSS學員_${randomSuffix}`
      
    currentUser.value = {
      username,
      role: customRole,
      loginMethod: method,
      avatarUrl: method === 'google'
        ? 'https://cdn-icons-png.flaticon.com/512/300/300221.png'
        : 'https://cdn-icons-png.flaticon.com/512/124/124027.png',
      church: customRole === 'admin' ? undefined : (church || '愛與話語'),
      childUsernames: customRole === 'parent' ? (childUsernames || []) : undefined
    }
    
    isAuthenticating.value = false
  }

  function logout() {
    currentUser.value = null
  }

  function updatePassword(username: string, oldPasswordHash: string, newPasswordHash: string): { success: boolean; message: string } {
    const user = usersDb.value[username]
    if (!user) {
      return { success: false, message: '找不到此帳號。' }
    }
    if (user.passwordHash !== oldPasswordHash) {
      return { success: false, message: '原密碼錯誤，請再試一次。' }
    }
    user.passwordHash = newPasswordHash
    return { success: true, message: '密碼修改成功！' }
  }

  /**
   * Admin-only: reset any user's password to the default value.
   * In production this would trigger an email with a reset link instead.
   */
  function adminResetPassword(username: string): { success: boolean; message: string } {
    const user = usersDb.value[username]
    if (!user) {
      return { success: false, message: '找不到此帳號。' }
    }
    user.passwordHash = DEFAULT_RESET_PASSWORD
    return { success: true, message: `帳號 ${username} 的密碼已重設為預設值。` }
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
    return { success: true, message: '個人資料已更新！' }
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
    loginWithThirdParty,
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
