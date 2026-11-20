/**
 * @file src/stores/parts/accountLinks.ts
 * @description The auth store's gender (性別) and parent ↔ child bindings (家長綁定), and the
 * name shown for an account.
 */
import type { Ref } from 'vue'
import type { UserRole, Gender } from '@/types/auth'
import { GENDERED_ROLES } from '@/types/auth'

/** What these functions read and change on an account */
interface LinkedAccount {
  role: UserRole
  gender?: Gender
  childUsernames?: string[]
  realName?: string
  displayName?: string
}

export function createAccountLinks<A extends LinkedAccount>({
  usersDb
}: {
  usersDb: Ref<Record<string, A>>
}) {
  // ── Gender ─────────────────────────────────────────────────────────────────
  // Set by pastors (their church) and SS central; only teachers and students have one.

  /** Whether this account's role uses a gender */
  function hasGender(username: string): boolean {
    const role = usersDb.value[username]?.role
    return !!role && GENDERED_ROLES.includes(role)
  }

  /** Set or clear (undefined) the gender of a teacher or student */
  function setGender(username: string, gender: Gender | undefined): void {
    if (!hasGender(username)) return
    const account = usersDb.value[username]
    if (gender) account.gender = gender
    else delete account.gender
  }

  /** The name to show for an account: real name, else nickname, else the username */
  function displayNameOf(username: string): string {
    const u = usersDb.value[username]
    return u?.realName || u?.displayName || username
  }

  // ── Parent ↔ child bindings ────────────────────────────────────────────────
  // The only record of which parent is bound to which student is the parent account's
  // childUsernames; it decides what a parent can see. Read and change it only here.

  /** Parent accounts bound to `student`, in account order */
  function parentsOf(student: string): string[] {
    return Object.keys(usersDb.value).filter((u) => {
      const account = usersDb.value[u]
      return account.role === 'parent' && (account.childUsernames ?? []).includes(student)
    })
  }

  /** The students bound to `parent` (empty for accounts that aren't parents) */
  function childrenOf(parent: string): string[] {
    const account = usersDb.value[parent]
    return account?.role === 'parent' ? [...(account.childUsernames ?? [])] : []
  }

  function bindChild(parent: string, student: string): void {
    const account = usersDb.value[parent]
    if (account?.role !== 'parent') return
    const children = account.childUsernames ?? []
    if (!children.includes(student)) account.childUsernames = [...children, student]
  }

  function unbindChild(parent: string, student: string): void {
    const account = usersDb.value[parent]
    if (account?.childUsernames?.includes(student)) {
      account.childUsernames = account.childUsernames.filter((u) => u !== student)
    }
  }

  /** Remove `student` from every parent, e.g. when the student account is deleted */
  function unbindChildEverywhere(student: string): void {
    parentsOf(student).forEach((parent) => unbindChild(parent, student))
  }

  return {
    hasGender,
    setGender,
    displayNameOf,
    parentsOf,
    childrenOf,
    bindChild,
    unbindChild,
    unbindChildEverywhere
  }
}
