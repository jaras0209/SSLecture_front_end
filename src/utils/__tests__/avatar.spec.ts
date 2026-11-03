import { describe, it, expect, vi } from 'vitest'
import { avatarSrc, defaultAvatarUrl, dicebearAvatarUrl, AVATAR_PLACEHOLDER } from '@/utils/avatar'

/** Ask for each avatar until its style has loaded and it is a generated SVG, as the app does */
const loaded = (...urls: string[]) =>
  vi.waitFor(
    () => {
      for (const url of urls) expect(avatarSrc(url)).not.toBe(AVATAR_PLACEHOLDER)
    },
    { timeout: 5000 }
  )

const svgOf = (dataUri: string) =>
  decodeURIComponent(dataUri.replace(/^data:image\/svg\+xml;[^,]*,/, ''))

describe('avatar urls', () => {
  it('keeps the DiceBear API URL format as the stored identifier', () => {
    expect(defaultAvatarUrl('student')).toBe(
      'https://api.dicebear.com/7.x/fun-emoji/svg?seed=student'
    )
    expect(dicebearAvatarUrl('pixel-art', 'ann')).toBe(
      'https://api.dicebear.com/7.x/pixel-art/svg?seed=ann'
    )
  })
})

describe('avatarSrc()', () => {
  it('passes through empty values and non-DiceBear URLs', () => {
    expect(avatarSrc(undefined)).toBeUndefined()
    expect(avatarSrc('')).toBe('')
    expect(avatarSrc('https://example.com/me.png')).toBe('https://example.com/me.png')
  })

  it('leaves DiceBear URLs for styles it does not bundle untouched', () => {
    const url = 'https://api.dicebear.com/7.x/identicon/svg?seed=x'
    expect(avatarSrc(url)).toBe(url)
  })

  it('returns a placeholder until the style loads, then a locally generated SVG', async () => {
    const url = dicebearAvatarUrl('bottts', 'placeholder-check')
    expect(avatarSrc(url)).toBe(AVATAR_PLACEHOLDER)

    await loaded(url)
    const src = avatarSrc(url)!
    expect(src.startsWith('data:image/svg+xml')).toBe(true)
    expect(svgOf(src)).toContain('<svg')
  })

  it('is deterministic per URL and differs between seeds', async () => {
    await loaded(defaultAvatarUrl('alice'))
    const a = avatarSrc(defaultAvatarUrl('alice'))
    expect(avatarSrc(defaultAvatarUrl('alice'))).toBe(a)
    expect(avatarSrc(defaultAvatarUrl('bob'))).not.toBe(a)
  })

  it('decodes the seed like the API server does (%xx and + in the query)', async () => {
    await loaded(defaultAvatarUrl('王 小明'))
    // "王 小明" written two ways must produce the same avatar
    const encoded = avatarSrc(
      'https://api.dicebear.com/7.x/fun-emoji/svg?seed=%E7%8E%8B+%E5%B0%8F%E6%98%8E'
    )
    const raw = avatarSrc(defaultAvatarUrl('王 小明'))
    expect(encoded).toBe(raw)
  })

  it('renders every bundled style', async () => {
    const styles = [
      'fun-emoji',
      'lorelei',
      'bottts',
      'adventurer',
      'pixel-art',
      'avataaars',
      'micah',
      'notionists'
    ] as const
    await loaded(...styles.map((style) => dicebearAvatarUrl(style, 'every-style')))
    for (const style of styles) {
      const src = avatarSrc(dicebearAvatarUrl(style, 'every-style'))!
      expect(src, style).not.toBe(AVATAR_PLACEHOLDER)
      expect(svgOf(src), style).toContain('<svg')
    }
  })
})
