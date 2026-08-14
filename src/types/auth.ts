/**
 * 使用者相關型別定義
 *
 * 集中管理 auth domain 的所有型別，供 stores、views、components、utils 共用。
 * 原先定義於 src/stores/auth.ts，v1.6.0 起抽離至此。
 */

/** 系統角色列表 */
export type UserRole = 'student' | 'teacher' | 'admin' | 'parent' | 'pastor'

/** 登入方式 */
export type LoginMethod = 'credentials' | 'google' | 'line'

/** 使用者主體介面 */
export interface User {
  username: string
  role: UserRole
  loginMethod: LoginMethod
  avatarUrl?: string
  church?: string
  childUsernames?: string[]
  displayName?: string       // 暱稱（未設定時顯示 username）
  realName?: string          // 真實姓名（管理端顯示用）
  email?: string             // Email（社群登入時從第三方取得）
  needsOnboarding?: boolean  // 首次社群登入，尚未完成 onboarding 流程
  lastLoginAt?: string       // 上次登入時間
}

/** 邀請碼 */
export interface InviteCode {
  code: string        // e.g. "SS-TCH-A3F7"
  role: UserRole      // 指定註冊角色
  church?: string     // 指定教會（admin 可為空）
  createdBy: string   // 產生者 username
  createdAt: string   // 產生時間
  expiresAt: string   // 到期時間
  usedBy?: string     // 使用者 username（使用後填入）
  usedAt?: string     // 使用時間
  revoked?: boolean   // 是否已作廢
}

/** 系統支援的教會清單 */
export const CHURCHES = [
  '愛與話語', '主大明', '主勝利', '主生命', '主和睦光',
  '台北主話語', '聖靈', '永明', '主希望光', '實踐',
  '主愛', '主大永', '主磐石', '信主', '宜蘭主話語',
  '天民', '主幸福', '信榮', '主盼望'
] as const

/** 教會名稱型別（從 CHURCHES 陣列推斷） */
export type Church = typeof CHURCHES[number]

/** Mock 環境下的預設重設密碼（後端就緒後由後端發送 Email 重設連結取代） */
export const DEFAULT_RESET_PASSWORD = '123456'
