/**
 * @file backup.ts
 * @description 全部資料的備份與還原（管理員頁面）。
 *
 * 後端完成前，所有資料都只存在這台電腦的瀏覽器裡（localStorage）：清除瀏覽器資料、
 * 換電腦或換瀏覽器就會全部消失。匯出把資料存成一個檔案，匯入從檔案還原；
 * 這個檔案日後也能用來把資料搬到後端。
 *
 * 只包含資料本身；登入狀態、登入期限、語言偏好屬於這台裝置，不在備份裡。
 */
import { flushPersistence, saveAllPersisted } from '@/utils/persist'

/** Every key that holds data, as the stores save it */
export const BACKUP_KEYS = [
  'superstart_users_db',
  'superstart_retired_usernames',
  'superstart_invite_codes',
  'superstart_student_teacher_db',
  'superstart_restrictions_db',
  'superstart_progress_db',
  'superstart_feedback_db',
  'superstart_feedback_seen_db',
  'superstart_shining_project_db',
  'superstart_character_themes_db',
  'superstart_coming_of_age_themes_db',
  'superstart_lecturers_db',
  'superstart_teaching_stats_db',
  'superstart_booking_sessions_db',
  'superstart_booking_attendees_db'
] as const

export type BackupKey = (typeof BACKUP_KEYS)[number]

const APP = 'sslecture'
/** Bumped when the stored data changes shape in a way older versions can't read */
export const BACKUP_VERSION = 1

export interface Backup {
  app: typeof APP
  version: number
  exportedAt: string
  data: Partial<Record<BackupKey, unknown>>
}

/** Why a file can't be restored */
export type BackupProblem = 'notJson' | 'notBackup' | 'newerVersion' | 'badData'

// ── Reminding to back up ──────────────────────────────────────────────────────
// A backup only helps if it is recent. When this computer last exported one is kept on this
// computer (not in the backup: it is about the device, like the sign-in).

const LAST_BACKUP_KEY = 'superstart_last_backup_at'
/** Remind the admin when the last backup is older than this, or there was none */
export const BACKUP_REMIND_AFTER_MS = 7 * 24 * 60 * 60 * 1000

/** When this computer last exported (or was restored from) a backup, if ever */
export function lastBackupAt(): number | null {
  try {
    const value = Number(localStorage.getItem(LAST_BACKUP_KEY))
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

/** Remember that the data as of `at` is in a backup */
export function noteBackup(at: number): void {
  try {
    localStorage.setItem(LAST_BACKUP_KEY, String(at))
  } catch {
    /* storage refused: the save warning covers it */
  }
}

/** Whether it is time to remind the admin to back up */
export function backupOverdue(now = Date.now()): boolean {
  const last = lastBackupAt()
  return last === null || now - last > BACKUP_REMIND_AFTER_MS
}

/**
 * Everything the stores hold. They are written out first, defaults included: data that was
 * never changed was never written, and the backup reads what is written.
 */
export function createBackup(now = new Date()): Backup {
  saveAllPersisted()
  const data: Backup['data'] = {}
  for (const key of BACKUP_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw === null) continue
    try {
      data[key] = JSON.parse(raw)
    } catch {
      /* unreadable: the store resets it on load anyway */
    }
  }
  return { app: APP, version: BACKUP_VERSION, exportedAt: now.toISOString(), data }
}

/** The file name for a backup, e.g. sslecture-backup-2026-11-10-0930.json (local time) */
export function backupFileName(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `sslecture-backup-${date}-${pad(now.getHours())}${pad(now.getMinutes())}.json`
}

/** Read a backup file's text, or say why it can't be used */
export function parseBackup(
  text: string
): { ok: true; backup: Backup } | { ok: false; problem: BackupProblem } {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, problem: 'notJson' }
  }
  const b = parsed as Partial<Backup> | null
  if (!b || typeof b !== 'object' || b.app !== APP || typeof b.version !== 'number') {
    return { ok: false, problem: 'notBackup' }
  }
  if (b.version > BACKUP_VERSION) return { ok: false, problem: 'newerVersion' }
  const data = b.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, problem: 'badData' }
  }
  for (const [key, value] of Object.entries(data)) {
    // Only our keys, and each a list or a record as the stores save them
    if (!(BACKUP_KEYS as readonly string[]).includes(key)) return { ok: false, problem: 'badData' }
    if (value === null || typeof value !== 'object') return { ok: false, problem: 'badData' }
  }
  if (!data.superstart_users_db) return { ok: false, problem: 'badData' } // no accounts at all
  return { ok: true, backup: b as Backup }
}

/** How many accounts a backup holds (to say what is being restored) */
export function accountCount(backup: Backup): number {
  return Object.keys((backup.data.superstart_users_db as object | undefined) ?? {}).length
}

/**
 * Replace all saved data with the backup's. All or nothing: if the browser refuses part of it,
 * what was there before is put back. The app must reload afterwards (the stores hold the old
 * data in memory, and would write it back).
 */
export function restoreBackup(backup: Backup): boolean {
  flushPersistence()
  const before = new Map(BACKUP_KEYS.map((key) => [key, localStorage.getItem(key)]))
  try {
    for (const key of BACKUP_KEYS) {
      const value = backup.data[key]
      if (value === undefined) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify(value))
    }
    // The data is now as it was when that backup was made
    noteBackup(Date.parse(backup.exportedAt) || Date.now())
    return true
  } catch {
    for (const [key, raw] of before) {
      try {
        if (raw === null) localStorage.removeItem(key)
        else localStorage.setItem(key, raw)
      } catch {
        /* nothing more to do */
      }
    }
    return false
  }
}
