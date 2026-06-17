import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent' | 'pastor'

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
  const savedUser = localStorage.getItem('superstart_user')
  
  const currentUser = ref<User | null>(savedUser ? JSON.parse(savedUser) : null)
  const isAuthenticated = ref<boolean>(!!currentUser.value)
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
  const savedDb = localStorage.getItem('superstart_users_db')
  if (savedDb) {
    usersDb.value = JSON.parse(savedDb)
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
      localStorage.setItem('superstart_user', JSON.stringify(newUser))
      isAuthenticated.value = true
    } else {
      localStorage.removeItem('superstart_user')
      isAuthenticated.value = false
    }
  })

  watch(usersDb, (newDb) => {
    localStorage.setItem('superstart_users_db', JSON.stringify(newDb))
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

  return {
    currentUser,
    isAuthenticated,
    isAuthenticating,
    usersDb,
    login,
    register,
    loginWithThirdParty,
    logout,
    updatePassword,
    updateProfile
  }
})
