import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import {
  BACKUP_KEYS,
  BACKUP_VERSION,
  accountCount,
  backupFileName,
  createBackup,
  parseBackup,
  restoreBackup,
  type Backup
} from '@/utils/backup'
import { persistToStorage } from '@/utils/persist'

const users = { student: { passwordHash: 'x', role: 'student' } }
const set = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value))
const get = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null')

describe('backup', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('holds the data, not this device’s sign-in, session or language', () => {
    set('superstart_users_db', users)
    set('superstart_progress_db', { student: {} })
    set('superstart_user', { username: 'admin' })
    set('superstart_session', { remember: true, lastActiveAt: 1 })
    localStorage.setItem('superstart_lang', 'en')
    const backup = createBackup(new Date('2026-11-10T01:30:00Z'))
    expect(backup).toEqual({
      app: 'sslecture',
      version: BACKUP_VERSION,
      exportedAt: '2026-11-10T01:30:00.000Z',
      data: { superstart_users_db: users, superstart_progress_db: { student: {} } }
    })
  })

  it('includes what the stores hold, even if never written or not yet written', async () => {
    // registered under a key the other tests here don't look at
    const data = ref({ student: ['/teacher'] })
    persistToStorage(data, 'superstart_restrictions_db')
    expect(localStorage.getItem('superstart_restrictions_db')).toBeNull() // never changed
    expect(createBackup().data.superstart_restrictions_db).toEqual({ student: ['/teacher'] })

    data.value.student.push('/admin')
    await nextTick() // the store has scheduled its write, a moment from now
    expect(createBackup().data.superstart_restrictions_db).toEqual({
      student: ['/teacher', '/admin']
    })
  })

  it('names the file by when it was made', () => {
    expect(backupFileName(new Date(2026, 10, 10, 9, 5))).toBe(
      'sslecture-backup-2026-11-10-0905.json'
    )
  })

  it('restores what it holds and clears what it does not', () => {
    set('superstart_users_db', users)
    set('superstart_feedback_db', { student: {} })
    const backup = createBackup()
    set('superstart_users_db', { other: {} })
    set('superstart_lecturers_db', [{ id: 'l9' }]) // added after the backup
    localStorage.removeItem('superstart_feedback_db')

    expect(restoreBackup(backup)).toBe(true)
    expect(get('superstart_users_db')).toEqual(users)
    expect(get('superstart_feedback_db')).toEqual({ student: {} })
    expect(localStorage.getItem('superstart_lecturers_db')).toBeNull()
  })

  it('changes nothing if the browser refuses part of it', () => {
    set('superstart_users_db', { current: {} })
    const backup: Backup = {
      app: 'sslecture',
      version: 1,
      exportedAt: '',
      data: Object.fromEntries(BACKUP_KEYS.map((k) => [k, { from: 'backup' }]))
    }
    // Storage fills up after a few writes
    const real = localStorage
    let writes = 0
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => real.getItem(k),
      removeItem: (k: string) => real.removeItem(k),
      setItem: (k: string, v: string) => {
        if (++writes === 4) throw new DOMException('full', 'QuotaExceededError')
        real.setItem(k, v)
      }
    })
    expect(restoreBackup(backup)).toBe(false)
    vi.unstubAllGlobals()
    expect(get('superstart_users_db')).toEqual({ current: {} })
    expect(localStorage.getItem('superstart_progress_db')).toBeNull()
  })

  describe('reading a file', () => {
    const valid = () => JSON.stringify(createBackup())
    beforeEach(() => set('superstart_users_db', users))

    it('accepts a backup exported here, and counts its accounts', () => {
      const parsed = parseBackup(valid())
      expect(parsed.ok).toBe(true)
      if (parsed.ok) expect(accountCount(parsed.backup)).toBe(1)
    })

    it.each([
      ['not JSON', 'hello', 'notJson'],
      ['someone else’s JSON', '{"name":"x"}', 'notBackup'],
      ['a list', '[1,2]', 'notBackup'],
      [
        'a newer version',
        JSON.stringify({ app: 'sslecture', version: 99, data: {} }),
        'newerVersion'
      ],
      ['no data', JSON.stringify({ app: 'sslecture', version: 1 }), 'badData'],
      [
        'a key we do not use',
        JSON.stringify({
          app: 'sslecture',
          version: 1,
          data: { superstart_users_db: {}, evil: {} }
        }),
        'badData'
      ],
      [
        'a value of the wrong kind',
        JSON.stringify({ app: 'sslecture', version: 1, data: { superstart_users_db: 'x' } }),
        'badData'
      ],
      [
        'no accounts',
        JSON.stringify({ app: 'sslecture', version: 1, data: { superstart_progress_db: {} } }),
        'badData'
      ]
    ])('refuses %s', (_name, text, problem) => {
      expect(parseBackup(text)).toEqual({ ok: false, problem })
    })
  })
})
