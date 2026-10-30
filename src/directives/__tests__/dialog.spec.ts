import { describe, it, expect, afterEach, vi } from 'vitest'
import { defineComponent, h, ref, withDirectives, nextTick, type Ref } from 'vue'
import { mount, type VueWrapper } from '@vue/test-utils'
import { vDialog } from '@/directives/dialog'

/** A page with an "open" button and a dialog (two fields and two buttons), optionally a nested one */
function setup() {
  const open = ref(false)
  const nested = ref(false)
  const close = vi.fn(() => (open.value = false))
  const closeNested = vi.fn(() => (nested.value = false))
  const App = defineComponent(
    () => () =>
      h('div', [
        h('button', { id: 'opener' }, 'open'),
        open.value &&
          withDirectives(
            h('div', { id: 'dialog', role: 'dialog' }, [
              h('button', { id: 'x' }, '×'),
              h('input', { id: 'first-field' }),
              h('input', { id: 'second-field' }),
              h('button', { id: 'ok' }, 'OK'),
              nested.value &&
                withDirectives(
                  h('div', { id: 'nested', role: 'alertdialog' }, [
                    h('button', { id: 'yes' }, 'Yes')
                  ]),
                  [[vDialog, closeNested]]
                )
            ]),
            [[vDialog, close]]
          )
      ])
  )
  const wrapper = mount(App, { attachTo: document.body })
  return { wrapper, open, nested, close, closeNested }
}

const active = () => document.activeElement?.id
const key = (k: string, shiftKey = false) =>
  document.dispatchEvent(
    new KeyboardEvent('keydown', { key: k, shiftKey, bubbles: true, cancelable: true })
  )

async function openFrom(open: Ref<boolean>) {
  ;(document.getElementById('opener') as HTMLElement).focus()
  open.value = true
  await nextTick()
}

let wrapper: VueWrapper | undefined
afterEach(() => {
  wrapper?.unmount()
  document.body.innerHTML = ''
})

describe('v-dialog', () => {
  it('moves focus to the first field when it opens and gives it back when it closes', async () => {
    const t = setup()
    wrapper = t.wrapper
    await openFrom(t.open)
    expect(active()).toBe('first-field')

    t.open.value = false
    await nextTick()
    expect(active()).toBe('opener')
  })

  it('closes on Escape', async () => {
    const t = setup()
    wrapper = t.wrapper
    await openFrom(t.open)
    key('Escape')
    await nextTick()
    expect(t.close).toHaveBeenCalledOnce()
    expect(document.getElementById('dialog')).toBeNull()
    expect(active()).toBe('opener')
  })

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    const t = setup()
    wrapper = t.wrapper
    await openFrom(t.open)
    ;(document.getElementById('ok') as HTMLElement).focus()
    key('Tab')
    expect(active()).toBe('x') // last → first

    key('Tab', true)
    expect(active()).toBe('ok') // first → last

    ;(document.getElementById('opener') as HTMLElement).focus() // focus somehow outside
    key('Tab')
    expect(active()).toBe('x')
  })

  it('lets the topmost dialog handle keys and then hands control back', async () => {
    const t = setup()
    wrapper = t.wrapper
    await openFrom(t.open)
    ;(document.getElementById('ok') as HTMLElement).focus()
    t.nested.value = true
    await nextTick()
    expect(active()).toBe('yes')

    key('Tab')
    expect(active()).toBe('yes') // trapped in the nested dialog
    key('Escape')
    await nextTick()
    expect(t.closeNested).toHaveBeenCalledOnce()
    expect(t.close).not.toHaveBeenCalled()
    expect(active()).toBe('ok') // back to where it was in the outer dialog

    key('Escape')
    await nextTick()
    expect(t.close).toHaveBeenCalledOnce()
  })

  it('stops listening once every dialog is closed', async () => {
    const t = setup()
    wrapper = t.wrapper
    await openFrom(t.open)
    t.open.value = false
    await nextTick()
    key('Escape')
    expect(t.close).not.toHaveBeenCalled()
  })
})
