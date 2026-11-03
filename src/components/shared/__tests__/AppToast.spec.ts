import { describe, it, expect, afterEach } from 'vitest'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import AppToast from '@/components/shared/AppToast.vue'
import { useToast } from '@/composables/useToast'
import { mountWith, t } from '@/__tests__/helpers'

const body = () => new DOMWrapper(document.body)

describe('AppToast', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('shows each toast with its kind, announced politely', async () => {
    const { wrapper } = mountWith(AppToast, { attachTo: document.body })
    const { toast } = useToast()
    toast('已儲存', 'success')
    toast('出了點問題', 'error')
    await flushPromises()
    expect(body().find('.toast-container').attributes('aria-live')).toBe('polite')
    expect(
      body()
        .findAll('.toast-item')
        .map((t) => t.classes().join(' '))
    ).toEqual(['toast-item toast-success', 'toast-item toast-error'])
    expect(body().find('.toast-error').text()).toBe('出了點問題')
    wrapper.unmount()
  })

  it.each([
    ['confirm', () => body().find('.confirm-actions .btn-danger'), true],
    ['cancel', () => body().find('.confirm-actions .btn-outline'), false],
    ['the backdrop', () => body().find('.confirm-overlay'), false]
  ])('answers a confirmation from %s', async (_label, target, answer) => {
    const { wrapper } = mountWith(AppToast, { attachTo: document.body })
    const pending = useToast().confirm('確定要刪除嗎？')
    await flushPromises()
    const dialog = body().find('[role="alertdialog"]')
    expect(dialog.find('#confirm-message').text()).toBe('確定要刪除嗎？')
    expect(dialog.text()).toContain(t('common.confirm'))

    await target().trigger('click')
    await expect(pending).resolves.toBe(answer)
    await flushPromises()
    expect(body().find('[role="alertdialog"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('treats Escape as cancel', async () => {
    const { wrapper } = mountWith(AppToast, { attachTo: document.body })
    const pending = useToast().confirm('確定嗎？')
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect(pending).resolves.toBe(false)
    wrapper.unmount()
  })
})
