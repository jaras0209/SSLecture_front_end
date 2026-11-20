/**
 * @file src/stores/parts/inviteCodes.ts
 * @description The auth store's invite codes (邀請碼): generate, check, use and revoke.
 */
import type { Ref } from 'vue'
import type { UserRole, InviteCode } from '@/types/auth'
import { randomCode } from '@/utils/id'
import { translate as t } from '@/i18n'

/** Length of an invite code's random part (see generateInviteCode) */
export const INVITE_CODE_LENGTH = 8

/** 邀請碼前綴（用於產生易讀的邀請碼） */
const ROLE_CODE_PREFIX: Record<UserRole, string> = {
  student: 'STU',
  teacher: 'TCH',
  pastor: 'PST',
  parent: 'PAR',
  admin: 'ADM'
}

export function createInviteCodes({
  inviteCodesDb
}: {
  inviteCodesDb: Ref<Record<string, InviteCode>>
}) {
  // ── Invite Code Actions ───────────────────────────────────────────────────────

  /**
   * Generate a one-time invite code for a specific role.
   * Format: SS-{ROLE_PREFIX}-{8 random characters}, e.g. SS-TCH-K7M2QX9D.
   * A code is all it takes to register with its role, admin included, so it must not be
   * guessable: 32^8 ≈ 1.1 trillion combinations per role (codes used to have 4 hex
   * characters, 65,536 per role; those already handed out still work). The backend must
   * also limit attempts (see the API spec, "嘗試次數限制").
   * The random part is regenerated until it doesn't collide with any existing code.
   */
  function generateInviteCode(
    role: UserRole,
    church: string | undefined,
    createdBy: string,
    expiryDays = 7
  ): string {
    const prefix = ROLE_CODE_PREFIX[role]
    let code = ''
    for (let attempt = 0; attempt < 100; attempt++) {
      const candidate = `SS-${prefix}-${randomCode(INVITE_CODE_LENGTH)}`
      if (!inviteCodesDb.value[candidate]) {
        code = candidate
        break
      }
    }
    if (!code) throw new Error(`Could not generate a unique ${prefix} invite code`)
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
   * Also prunes invite codes older than 30 days to keep localStorage clean.
   */
  function validateInviteCode(code: string): InviteCode | null {
    // Prune stale codes on every validation call (lightweight cleanup)
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000 // 30 days
    for (const [key, invite] of Object.entries(inviteCodesDb.value)) {
      const isExpired = new Date(invite.expiresAt).getTime() < cutoff
      const isOldUsed = invite.usedAt && new Date(invite.usedAt).getTime() < cutoff
      const isOldRevoked = invite.revoked && new Date(invite.createdAt).getTime() < cutoff
      if (isExpired || isOldUsed || isOldRevoked) {
        delete inviteCodesDb.value[key]
      }
    }

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
    if (!invite) return { success: false, message: t('stores.auth.inviteNotFound') }
    if (invite.usedBy) return { success: false, message: t('stores.auth.inviteAlreadyUsed') }
    invite.revoked = true
    return { success: true, message: t('stores.auth.inviteRevoked', { code }) }
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
    generateInviteCode,
    validateInviteCode,
    consumeInviteCode,
    revokeInviteCode,
    getInviteCodes
  }
}
