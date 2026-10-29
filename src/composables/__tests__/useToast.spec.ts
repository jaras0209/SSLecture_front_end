import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useToast, useToastProvider, resolveConfirm } from '@/composables/useToast'

describe('useToast()', () => {
  const { toasts, confirmState } = useToastProvider()

  beforeEach(() => {
    vi.useFakeTimers()
    toasts.value = []
  })
  afterEach(() => {
    resolveConfirm(false)
    vi.useRealTimers()
  })

  it('shows a toast and removes it after its duration', () => {
    const { toast } = useToast()
    toast('saved')
    toast('oops', 'error', 5000)
    expect(toasts.value.map((x) => [x.text, x.type])).toEqual([
      ['saved', 'success'],
      ['oops', 'error']
    ])

    vi.advanceTimersByTime(3000)
    expect(toasts.value.map((x) => x.text)).toEqual(['oops'])
    vi.advanceTimersByTime(2000)
    expect(toasts.value).toEqual([])
  })

  it('has shortcuts for each type', () => {
    const { success, error, warning, info } = useToast()
    success('a')
    error('b')
    warning('c')
    info('d')
    expect(toasts.value.map((x) => x.type)).toEqual(['success', 'error', 'warning', 'info'])
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
