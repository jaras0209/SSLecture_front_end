/**
 * @file scope.ts
 * @description 「誰看得到誰」的規則集中在這裡。
 *
 * 目前的規則以教會為界：
 * - membersOf：某教會某角色的所有成員（牧者總覽、管理員的教會概況、註冊時綁定學員、
 *   講師連結帳號等「以教會為單位」的清單）
 * - canViewStudent / visibleStudents：某位檢視者（教師、牧者、家長）在學員清單、
 *   預約邀請等畫面上看得到哪些學員
 *
 * 之後若要加上其他條件（例如教師與學員依性別分開管理），只需修改這裡，
 * 所有畫面會一致套用。
 */
import type { UserRole } from '@/types/auth'

/** The parts of an account the rules look at */
export interface Member {
  role: UserRole | string
  church?: string
}

export type MembersDb = Record<string, Member>

/** The signed-in user looking at the list */
export interface Viewer {
  username: string
  role: UserRole
  church?: string
  childUsernames?: string[]
}

/** Accounts with `role` in `church` (exact match), in account order */
export function membersOf(
  members: MembersDb,
  role: UserRole,
  church: string | undefined
): string[] {
  return Object.keys(members).filter(
    (u) => members[u].role === role && members[u].church === church
  )
}

/**
 * Whether `viewer` may see the student `username` in staff views.
 * - Parents see only their bound children.
 * - Everyone else sees the students of their own church; a viewer without a church
 *   (SS central) sees every student, including legacy progress records that have no
 *   account. Accounts that aren't students are never listed.
 */
export function canViewStudent(viewer: Viewer, username: string, members: MembersDb): boolean {
  if (viewer.role === 'parent') return (viewer.childUsernames ?? []).includes(username)
  const account = members[username]
  if (!account) return !viewer.church // legacy record without an account
  if (account.role !== 'student') return false
  return !viewer.church || account.church === viewer.church
}

/**
 * The students `viewer` may see, in display order: a parent's children in the order
 * they were bound; otherwise student accounts in account order, followed by any
 * `extraUsernames` without an account (e.g. usernames that only have progress records).
 */
export function visibleStudents(
  viewer: Viewer,
  members: MembersDb,
  extraUsernames: Iterable<string> = []
): string[] {
  if (viewer.role === 'parent') return [...(viewer.childUsernames ?? [])]
  const result = new Set<string>()
  for (const username of [...Object.keys(members), ...extraUsernames]) {
    if (!result.has(username) && canViewStudent(viewer, username, members)) result.add(username)
  }
  return [...result]
}
