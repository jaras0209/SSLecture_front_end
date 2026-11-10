/**
 * @file session.ts
 * @description 登入狀態的有效期限：閒置太久或關掉瀏覽器後自動登出。
 *
 * 教會常用共用的電腦或平板，登入狀態若永遠保留，下一個人就能看到前一位的資料、
 * 以前一位的身分操作。所以：
 * - 未勾「記住我」（預設）：閒置 IDLE_LIMIT_MS（2 小時）就登出；關掉瀏覽器後也要重新登入
 *   （重新整理、另開分頁不算）
 * - 勾了「記住我」：在這台裝置上保持登入，REMEMBERED_LIMIT_MS（30 天）沒使用才登出
 *
 * 登入資料本身仍存在 localStorage（各分頁共用，見 stores/auth.ts）；這裡另外記下「是否記住、
 * 最後一次操作的時間」，所有分頁共用同一份，任一分頁有操作就算整個登入在使用中。
 */

const META_KEY = 'superstart_session'
const USER_KEY = 'superstart_user'
/** In sessionStorage: this tab has been open (survives a reload, not closing the browser) */
const TAB_KEY = 'superstart_tab_open'
/** In sessionStorage: why this tab was signed out, for the login page to say once */
const REASON_KEY = 'superstart_signout_reason'

export const IDLE_LIMIT_MS = 2 * 60 * 60 * 1000
export const REMEMBERED_LIMIT_MS = 30 * 24 * 60 * 60 * 1000
/** Activity is recorded at most this often (it is written to localStorage) */
const TOUCH_EVERY_MS = 30 * 1000
/** How long a new tab waits for another open tab of the site to answer */
export const TAB_REPLY_WAIT_MS = 150

export type SignOutReason = 'idle'

export interface SessionMeta {
  remember: boolean
  /** Last activity in any tab (ms since epoch) */
  lastActiveAt: number
}

function read<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage refused: the save warning covers it (utils/storage.ts) */
  }
}

function remove(storage: Storage, key: string): void {
  try {
    storage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function sessionMeta(): SessionMeta | null {
  return read<SessionMeta>(localStorage, META_KEY)
}

/** A sign-in just happened in this tab: start counting from now */
export function beginSession(remember: boolean, now = Date.now()): void {
  write(localStorage, META_KEY, { remember, lastActiveAt: now } satisfies SessionMeta)
  write(sessionStorage, TAB_KEY, true)
}

/** Signed out: nothing left to time */
export function endSession(): void {
  remove(localStorage, META_KEY)
}

/** The user did something: the session is in use (written at most every 30 s) */
export function touchSession(now = Date.now()): void {
  const meta = sessionMeta()
  if (meta && now - meta.lastActiveAt >= TOUCH_EVERY_MS) {
    write(localStorage, META_KEY, { ...meta, lastActiveAt: now })
  }
}

/** How long a session may go unused */
export function sessionLimit(meta: SessionMeta): number {
  return meta.remember ? REMEMBERED_LIMIT_MS : IDLE_LIMIT_MS
}

/** Whether the session has gone unused for too long */
export function sessionExpired(now = Date.now()): boolean {
  const meta = sessionMeta()
  return !!meta && now - meta.lastActiveAt > sessionLimit(meta)
}

/** Remember why this tab was signed out, for the login page */
export function noteSignOutReason(reason: SignOutReason): void {
  write(sessionStorage, REASON_KEY, reason)
}

/** Why this tab was signed out, once (then forgotten) */
export function takeSignOutReason(): SignOutReason | null {
  const reason = read<SignOutReason>(sessionStorage, REASON_KEY)
  remove(sessionStorage, REASON_KEY)
  return reason
}

// ── Tabs: was the browser closed? ─────────────────────────────────────────────

const CHANNEL = 'superstart_tabs'
/** This page load; a tab must not answer its own question */
const thisTab = Math.random().toString(36).slice(2)

type TabMessage = { type: 'anyone-open?'; from: string } | { type: 'open'; to: string }

const channel: BroadcastChannel | null =
  typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL)

// Every open tab of the site answers another tab asking whether the browser stayed open
channel?.addEventListener('message', (event: MessageEvent<TabMessage>) => {
  const message = event.data
  if (message?.type === 'anyone-open?' && message.from !== thisTab) {
    channel.postMessage({ type: 'open', to: message.from } satisfies TabMessage)
  }
})

/** Whether another tab of the site is open right now (asks them, waits briefly) */
function anotherTabOpen(): Promise<boolean> {
  if (!channel) return Promise.resolve(false)
  return new Promise((resolve) => {
    const ask = new BroadcastChannel(CHANNEL)
    const done = (answer: boolean) => {
      clearTimeout(timer)
      ask.close()
      resolve(answer)
    }
    const timer = setTimeout(() => done(false), TAB_REPLY_WAIT_MS)
    ask.addEventListener('message', (event: MessageEvent<TabMessage>) => {
      if (event.data?.type === 'open' && event.data.to === thisTab) done(true)
    })
    ask.postMessage({ type: 'anyone-open?', from: thisTab } satisfies TabMessage)
  })
}

/**
 * Run before the app starts: end a session that has run out, before anything reads it.
 * - unused for too long → signed out, and the login page says why
 * - not remembered, and the browser was closed (this tab wasn't open before and no other tab
 *   of the site is) → signed out
 * A sign-in from before sessions were timed starts being timed now, as not remembered.
 */
export async function settleSessionOnStart(now = Date.now()): Promise<void> {
  const signedIn = read(localStorage, USER_KEY) !== null
  const tabWasOpen = read<boolean>(sessionStorage, TAB_KEY) === true
  write(sessionStorage, TAB_KEY, true)
  if (!signedIn) {
    endSession()
    return
  }

  const meta = sessionMeta()
  if (!meta) {
    beginSession(false, now)
    return
  }
  if (sessionExpired(now)) {
    signOutStored()
    noteSignOutReason('idle')
    return
  }
  if (!meta.remember && !tabWasOpen && !(await anotherTabOpen())) signOutStored()
}

/** Sign out before the stores load (they read the session from storage) */
function signOutStored(): void {
  remove(localStorage, USER_KEY)
  endSession()
}
