/**
 * @file avatar.ts
 * @description 在瀏覽器內產生 DiceBear 頭像，不再向 api.dicebear.com 發出請求。
 *
 * 使用者資料中的 avatarUrl 仍沿用原本的 DiceBear API 網址格式
 * （https://api.dicebear.com/7.x/<style>/svg?seed=<seed>），作為頭像的「代號」：
 * 已儲存的資料不需轉換，之後若改回使用 API 也相容。顯示時由 avatarSrc() 轉成
 * 本機產生的 data URI；其他網址（自訂圖片、OAuth 大頭照）則原樣使用。
 *
 * 各風格的圖形資料不小（8 種合計約 1 MB），因此按需載入：第一次需要某風格時才
 * 下載該風格的 chunk，載入前先回傳透明佔位圖，載入後透過 reactive 版本號讓
 * 呼叫 avatarSrc() 的元件自動重新渲染。
 */

import { ref } from 'vue'
import type { createAvatar } from '@dicebear/core'

type AvatarStyle = Parameters<typeof createAvatar>[0]

/** 支援的頭像風格（id 與 DiceBear API 路徑一致），各自為獨立 chunk */
const STYLE_LOADERS = {
  'fun-emoji': () => import('@dicebear/fun-emoji'),
  lorelei: () => import('@dicebear/lorelei'),
  bottts: () => import('@dicebear/bottts'),
  adventurer: () => import('@dicebear/adventurer'),
  'pixel-art': () => import('@dicebear/pixel-art'),
  avataaars: () => import('@dicebear/avataaars'),
  micah: () => import('@dicebear/micah'),
  notionists: () => import('@dicebear/notionists')
} satisfies Record<string, () => Promise<AvatarStyle>>

export type AvatarStyleId = keyof typeof STYLE_LOADERS

const API_PREFIX = 'https://api.dicebear.com/7.x/'

/** 載入中顯示的透明佔位圖（避免出現破圖或 alt 文字） */
export const AVATAR_PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/%3E'

/** 頭像代號網址（與原本的 DiceBear API 網址相同，可直接存入 avatarUrl） */
export function dicebearAvatarUrl(style: AvatarStyleId, seed: string): string {
  return `${API_PREFIX}${style}/svg?seed=${seed}`
}

/** 預設頭像（fun-emoji，以帳號為 seed） */
export function defaultAvatarUrl(seed: string): string {
  return dicebearAvatarUrl('fun-emoji', seed)
}

const loadedStyles = new Map<string, AvatarStyle>()
const pendingStyles = new Map<string, Promise<void>>()
let createAvatarFn: typeof createAvatar | null = null
const cache = new Map<string, string>()
/** Bumped whenever a style finishes loading, so avatarSrc() callers re-render */
const loadVersion = ref(0)

function loadStyle(styleId: AvatarStyleId): Promise<void> {
  let pending = pendingStyles.get(styleId)
  if (!pending) {
    pending = Promise.all([import('@dicebear/core'), STYLE_LOADERS[styleId]()]).then(
      ([core, style]) => {
        createAvatarFn = core.createAvatar
        loadedStyles.set(styleId, style)
        loadVersion.value++
      }
    )
    pendingStyles.set(styleId, pending)
  }
  return pending
}

/** Parse a DiceBear API URL into its style id and seed (same decoding as the API server). */
function parseDicebearUrl(url: string): { styleId: AvatarStyleId; seed: string } | null {
  if (!url.startsWith(API_PREFIX)) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const styleId = parsed.pathname.split('/')[2] // /7.x/<style>/svg
  if (!(styleId in STYLE_LOADERS)) return null
  return { styleId: styleId as AvatarStyleId, seed: parsed.searchParams.get('seed') ?? '' }
}

/**
 * 取得 <img src> 可用的頭像來源：DiceBear 代號網址 → 本機產生的 SVG data URI（快取）；
 * 其他網址或無法辨識的風格原樣回傳。風格尚未載入時回傳 AVATAR_PLACEHOLDER 並開始載入。
 */
export function avatarSrc(url: string | undefined): string | undefined {
  if (!url) return url
  const cached = cache.get(url)
  if (cached) return cached

  const parsed = parseDicebearUrl(url)
  if (!parsed) return url

  // Track the version so the calling render re-runs once the style has loaded
  void loadVersion.value
  const style = loadedStyles.get(parsed.styleId)
  if (!style || !createAvatarFn) {
    void loadStyle(parsed.styleId)
    return AVATAR_PLACEHOLDER
  }

  const dataUri = createAvatarFn(style, { seed: parsed.seed }).toDataUri()
  cache.set(url, dataUri)
  return dataUri
}

/** 預先載入風格（例如開啟頭像選擇器前），回傳載入完成的 Promise。 */
export function preloadAvatarStyles(styleIds: AvatarStyleId[]): Promise<void> {
  return Promise.all(styleIds.map(loadStyle)).then(() => undefined)
}
