import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import { useToast, useToastProvider, resolveConfirm } from '@/composables/useToast'
import { persistToStorage } from '@/utils/persist'
import { storageWriteFailed } from '@/utils/storage'
import { refuseStorageWrites } from '@/__tests__/helpers'

describe('useToast()', () => {
  const { toasts, confirmState } = useToastProvider()

  beforeEach(() => {
    vi.useFakeTimers()
    toasts.value = []
  })
  afterEach(() => {
    resolveConfirm(false)
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    storageWriteFailed.value = false
  })

  it('shows a toast and removes it after its duration', async () => {
    const { toast } = useToast()
    toast('saved')
    toast('oops', 'error', 5000)
    await nextTick() // a success first checks the change was saved
    expect(toasts.value.map((x) => [x.text, x.type])).toEqual([
      ['oops', 'error'],
      ['saved', 'success']
    ])

    vi.advanceTimersByTime(3000)
    expect(toasts.value.map((x) => x.text)).toEqual(['oops'])
    vi.advanceTimersByTime(2000)
    expect(toasts.value).toEqual([])
  })

  it('has shortcuts for each type', async () => {
    const { success, error, warning, info } = useToast()
    success('a')
    error('b')
    warning('c')
    info('d')
    await nextTick()
    expect(toasts.value.map((x) => x.type).sort()).toEqual(['error', 'info', 'success', 'warning'])
  })

  it('saves pending changes before saying something succeeded, and stays quiet if that fails', async () => {
    const data = ref({ n: 0 })
    persistToStorage(data, 'toast_test_key')
    const { toast } = useToast()

    data.value.n = 1
    toast('已儲存')
    await nextTick()
    // written now, not after the usual delay
    expect(localStorage.getItem('toast_test_key')).toBe('{"n":1}')
    expect(toasts.value.map((x) => x.text)).toEqual(['已儲存'])

    toasts.value = []
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    refuseStorageWrites()
    data.value.n = 2
    toast('已儲存')
    toast('提醒', 'info') // other kinds don't wait
    await nextTick()
    expect(toasts.value.map((x) => x.text)).toEqual(['提醒'])
    expect(storageWriteFailed.value).toBe(true) // the save warning says what happened instead
  })

  it('confirm() resolves with the answer and closes the dialog', async () => {
    const { confirm } = useToast()
    const answer = confirm('Delete?')
    expect(confirmState.value).toMatchObject({ visible: true, message: 'Delete?' })

    resolveConfirm(true)
    await expect(answer).resolves.toBe(true)
    expect(confirmState.value.visible).toBe(false)
  })

  it('a new confirm() cancels the one still open', async () => {
    const { confirm } = useToast()
    const first = confirm('First?')
    const second = confirm('Second?')
    await expect(first).resolves.toBe(false)
    expect(confirmState.value.message).toBe('Second?')

    resolveConfirm(true)
    await expect(second).resolves.toBe(true)
  })
})
