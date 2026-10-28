import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { persistToStorage, flushPersistence, PERSIST_DELAY_MS } from '@/utils/persist'

describe('persistToStorage()', () => {
  let setItem: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    setItem = vi.spyOn(localStorage, 'setItem')
  })

  afterEach(() => {
    flushPersistence()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  const writesTo = (key: string) => setItem.mock.calls.filter(([k]) => k === key).length

  it('coalesces changes across ticks into one write after the delay', async () => {
    const state = ref({ count: 0 })
    persistToStorage(state, 'k_coalesce')

    for (let i = 1; i <= 5; i++) {
      state.value.count = i
      await nextTick()
      vi.advanceTimersByTime(PERSIST_DELAY_MS - 50)
    }
    expect(writesTo('k_coalesce')).toBe(0)

    vi.advanceTimersByTime(PERSIST_DELAY_MS)
    expect(writesTo('k_coalesce')).toBe(1)
    expect(JSON.parse(localStorage.getItem('k_coalesce') || 'null')).toEqual({ count: 5 })
  })

  it('does not write when nothing changed', async () => {
    persistToStorage(ref({ a: 1 }), 'k_untouched')
    await nextTick()
    vi.advanceTimersByTime(PERSIST_DELAY_MS * 2)
    expect(writesTo('k_untouched')).toBe(0)
  })

  it('flushPersistence() writes pending changes immediately, once', async () => {
    const state = ref<string[]>([])
    persistToStorage(state, 'k_flush')
    state.value.push('x')
    await nextTick()

    flushPersistence()
    expect(JSON.parse(localStorage.getItem('k_flush') || 'null')).toEqual(['x'])

    vi.advanceTimersByTime(PERSIST_DELAY_MS * 2)
    expect(writesTo('k_flush')).toBe(1)
  })

  it('flushes when the page is hidden', async () => {
    const state = ref({ v: 'a' })
    persistToStorage(state, 'k_hidden')
    state.value.v = 'b'
    await nextTick()

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    document.dispatchEvent(new Event('visibilitychange'))
    expect(JSON.parse(localStorage.getItem('k_hidden') || 'null')).toEqual({ v: 'b' })
  })

  it('flushes on pagehide', async () => {
    const state = ref({ v: 1 })
    persistToStorage(state, 'k_pagehide')
    state.value.v = 2
    await nextTick()

    window.dispatchEvent(new Event('pagehide'))
    expect(JSON.parse(localStorage.getItem('k_pagehide') || 'null')).toEqual({ v: 2 })
  })

  it('stores write through the same debounce', async () => {
    setActivePinia(createPinia())
    const { useCoursesStore } = await import('@/stores/courses')
    const store = useCoursesStore()

    store.addTheme('character', '主題一', '愛與話語')
    await nextTick()
    store.addTheme('character', '主題二', '愛與話語')
    await nextTick()
    expect(writesTo('superstart_character_themes_db')).toBe(0)

    vi.advanceTimersByTime(PERSIST_DELAY_MS)
    expect(writesTo('superstart_character_themes_db')).toBe(1)
    const saved = JSON.parse(localStorage.getItem('superstart_character_themes_db') || '{}')
    expect(saved['愛與話語']).toEqual(expect.arrayContaining(['主題一', '主題二']))
  })
})
