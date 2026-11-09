/**
 * @file id.ts
 * @description 產生不會碰撞的識別碼。
 *
 * 使用 crypto.getRandomValues（非安全內容如 http://區網 IP 也可用，
 * 不像 crypto.randomUUID 需要 HTTPS），取代以 Date.now() 組成、
 * 同一毫秒內會重複的 ID。
 */

/** 產生 n 個隨機位元組的小寫十六進位字串（長度 2n） */
export function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * 給人看、要人輸入的代碼字元：大寫英文與數字，去掉容易看錯的 0/O、1/I。
 * 剛好 32 個，256 可被 32 整除，所以每個字元出現機率相同（不偏向某些字）。
 */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** 產生 n 個 CODE_ALPHABET 字元的隨機代碼（每個字元 5 bits） */
export function randomCode(length: number): string {
  const buf = new Uint8Array(length)
  crypto.getRandomValues(buf)
  return Array.from(buf, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

/** 產生帶前綴的唯一 ID，例如 createId('sess') → "sess_3f9c…"（128-bit 隨機） */
export function createId(prefix: string): string {
  return `${prefix}_${randomHex(16)}`
}
