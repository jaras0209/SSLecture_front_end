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
 * 教師與學員依性別分開管理：教師只看得到同教會、同性別的學員；任一方尚未設定性別時
 * 看不到（由牧者補齊）。牧者、SS 中央、家長不受性別限制。
 *
 * 講師例外（canViewAttendee）：連結到講師資料的教師或牧者帳號，在「自己授課的預約」裡看得到
 * 全部學員，不分男女，以便記錄出席；學員名冊等其他畫面仍依上面的規則。
 * 所有畫面都經過這裡，規則改這一處即一致套用。
 */
import type { Gender, UserRole } from '@/types/auth'

/** The parts of an account the rules look at */
export interface Member {
  role: UserRole | string
  church?: string
  gender?: Gender
  childUsernames?: string[]
}

export type MembersDb = Record<string, Member>

/** The signed-in user looking at the list */
export interface Viewer {
  username: string
  role: UserRole
  church?: string
  childUsernames?: string[]
  gender?: Gender
}

/** The viewer for an account, read from the account itself (so changes apply at once) */
export function viewerOf(username: string, members: MembersDb): Viewer | undefined {
  const account = members[username]
  if (!account) return undefined
  return {
    username,
    role: account.role as UserRole,
    church: account.church,
    childUsernames: account.childUsernames ?? [],
    gender: account.gender
  }
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
 * - Teachers see the students of their own church who have the same gender as they do;
 *   if either gender isn't set yet, the student is hidden.
 * - Pastors and others see the students of their own church; a viewer without a church
 *   (SS central) sees every student, including legacy progress records that have no
 *   account. Accounts that aren't students are never listed.
 */
export function canViewStudent(viewer: Viewer, username: string, members: MembersDb): boolean {
  if (viewer.role === 'parent') return (viewer.childUsernames ?? []).includes(username)
  const account = members[username]
  if (viewer.role === 'teacher' && !(viewer.gender && account?.gender === viewer.gender)) {
    return false
  }
  if (!account) return !viewer.church // legacy record without an account
  if (account.role !== 'student') return false
  return !viewer.church || account.church === viewer.church
}

/** Whether `teacher` may be the mentor of `student` (i.e. can see them) */
export function canMentor(teacher: string, student: string, members: MembersDb): boolean {
  const viewer = viewerOf(teacher, members)
  return viewer?.role === 'teacher' && canViewStudent(viewer, student, members)
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

/** Roles whose accounts may be linked to a lecturer record (and get My Lectures) */
export const LECTURER_ROLES: readonly UserRole[] = ['teacher', 'pastor']

export function canLecture(role: UserRole | string | undefined): boolean {
  return LECTURER_ROLES.includes(role as UserRole)
}

/** The parts of a lecturer record the rules look at */
export interface LecturerLink {
  id: string
  linkedUsername?: string
}

/** The ids of the lecturer records linked to `username` (the lectures they give) */
export function lecturerIdsOf(username: string, lecturers: LecturerLink[]): string[] {
  return lecturers.filter((l) => l.linkedUsername === username).map((l) => l.id)
}

/**
 * Whether `viewer` may see the attendee `username` of a booking: anyone who may see the
 * student anyway, and the booking's lecturer (through a linked account), who sees every
 * attendee of the lectures they give regardless of gender.
 */
export function canViewAttendee(
  viewer: Viewer,
  session: { lecturerId: string },
  username: string,
  members: MembersDb,
  lecturers: LecturerLink[]
): boolean {
  return (
    canViewStudent(viewer, username, members) ||
    lecturerIdsOf(viewer.username, lecturers).includes(session.lecturerId)
  )
}
