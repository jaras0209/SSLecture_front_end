import { describe, it, expect, beforeEach, afterEach, vi, type MockInstance } from 'vitest'
import { nextTick, ref } from 'vue'
import { setActivePinia, createPinia } from 'pinia'
import { persistToStorage, flushPersistence, PERSIST_DELAY_MS } from '@/utils/persist'

describe('persistToStorage()', () => {
  let setItem: MockInstance<Storage['setItem']>

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

describe('persistToStorage() — changes from another tab', () => {
  let setItem: MockInstance<Storage['setItem']>

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
  /** What the browser fires in this tab when another tab writes localStorage[key] */
  const otherTabWrites = (key: string, value: unknown) =>
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue: value === null ? null : typeof value === 'string' ? value : JSON.stringify(value)
      })
    )

  it("applies the other tab's value without writing it back", async () => {
    const state = ref({ items: ['a'] })
    persistToStorage(state, 'k_remote')
    otherTabWrites('k_remote', { items: ['a', 'b'] })
    await nextTick()
    expect(state.value).toEqual({ items: ['a', 'b'] })
    vi.advanceTimersByTime(PERSIST_DELAY_MS * 2)
    expect(writesTo('k_remote')).toBe(0)
  })

  it("drops this tab's pending write in favour of the other tab's newer save", async () => {
    const state = ref({ v: 1 })
    persistToStorage(state, 'k_conflict')
    state.value.v = 2 // local change, still within the debounce window
    await nextTick()
    otherTabWrites('k_conflict', { v: 3 })
    await nextTick()
    vi.advanceTimersByTime(PERSIST_DELAY_MS * 2)
    expect(state.value).toEqual({ v: 3 })
    expect(writesTo('k_conflict')).toBe(0)
  })

  it('keeps persisting local changes made after a remote update', async () => {
    const state = ref({ v: 1 })
    persistToStorage(state, 'k_after')
    otherTabWrites('k_after', { v: 2 })
    await nextTick()
    state.value.v = 5
    await nextTick()
    vi.advanceTimersByTime(PERSIST_DELAY_MS)
    expect(JSON.parse(localStorage.getItem('k_after') || 'null')).toEqual({ v: 5 })
  })

  it('ignores other keys, malformed values and removals', async () => {
    const state = ref({ v: 1 })
    persistToStorage(state, 'k_ignore')
    otherTabWrites('some_other_key', { v: 9 })
    otherTabWrites('k_ignore', '{not json')
    otherTabWrites('k_ignore', null)
    await nextTick()
    expect(state.value).toEqual({ v: 1 })
  })

  it('updates a store when another tab saves its data', async () => {
    setActivePinia(createPinia())
    const { useCoursesStore } = await import('@/stores/courses')
    const store = useCoursesStore()
    otherTabWrites('superstart_character_themes_db', { 愛與話語: ['別的分頁新增的主題'] })
    await nextTick()
    expect(store.getThemesByChurch('character', '愛與話語')).toEqual(['別的分頁新增的主題'])
  })
})
