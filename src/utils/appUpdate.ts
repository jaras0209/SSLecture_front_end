/**
 * @file src/utils/appUpdate.ts
 * @description Recover when a part of the app can't be downloaded because the site was updated.
 *
 * Each deploy gives the app's files new names and removes the old ones. A tab opened before the
 * update still asks for the old names the first time it needs a page, the English messages, an
 * avatar style or a dialog — and gets nothing, so the click seems to do nothing.
 *
 * - Moving to another page: reload straight into that page, which brings the new version.
 *   Nothing is lost (the user was leaving the page anyway).
 * - Anything else: show a notice with a reload button rather than reloading on the spot, which
 *   could throw away something being typed.
 * - At most one automatic reload in a short while: if the file still can't be loaded right
 *   after one (the connection is down, say), show the notice instead of reloading again.
 */

import { ref } from 'vue'

/** Set when part of the app couldn't be loaded; App.vue shows the reload notice */
export const appUpdateNeeded = ref(false)

const RELOADED_AT_KEY = 'superstart_reloaded_for_update_at'
/** How long after an automatic reload another one is held back */
export const RELOAD_GUARD_MS = 10_000

// How each browser words a module that couldn't be fetched (plus Vite's own CSS preload error)
const STALE_FILE_MESSAGES = [
  'Failed to fetch dynamically imported module', // Chrome, Edge
  'error loading dynamically imported module', // Firefox
  'Importing a module script failed', // Safari
  'Unable to preload CSS' // Vite, for a page's stylesheet
]

/** Whether `error` means one of the app's own files couldn't be downloaded */
export function isStaleFileError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return STALE_FILE_MESSAGES.some((m) => message.includes(m))
}

function reloadedRecently(now: number): boolean {
  try {
    const at = Number(sessionStorage.getItem(RELOADED_AT_KEY))
    return Number.isFinite(at) && now - at < RELOAD_GUARD_MS
  } catch {
    return true // can't tell, so don't risk reloading over and over
  }
}

function noteReload(now: number): boolean {
  try {
    sessionStorage.setItem(RELOADED_AT_KEY, String(now))
    return true
  } catch {
    return false
  }
}

/**
 * Handle an error if it means a file couldn't be downloaded; returns whether it did.
 * `destination` (an address) is where the user was going: reload into it if allowed,
 * otherwise (or without one) show the reload notice.
 */
export function recoverFromStaleFile(error: unknown, destination?: string): boolean {
  if (!isStaleFileError(error)) return false
  const now = Date.now()
  if (destination !== undefined && !reloadedRecently(now) && noteReload(now)) {
    window.location.assign(destination)
  } else {
    appUpdateNeeded.value = true
  }
  return true
}

/** The reload notice's button */
export function reloadApp(): void {
  window.location.reload()
}
