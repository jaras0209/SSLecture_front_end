/**
 * @file dialog.ts
 * @description v-dialog：讓對話框可以用鍵盤操作（WAI-ARIA dialog pattern）。
 *
 * 掛在對話框元素上（通常也就是 role="dialog" 的元素），值為關閉對話框的函式：
 *   <div v-if="open" role="dialog" v-dialog="close">…</div>
 *
 * - 開啟時把焦點移進對話框（[autofocus] → 第一個輸入欄位 → 第一個可聚焦元素 → 對話框本身）
 * - Tab / Shift+Tab 只在對話框內循環，不會跑到背後的頁面
 * - Esc 呼叫關閉函式（與按「取消」或點背景相同）
 * - 關閉後把焦點還給開啟對話框的元素
 *
 * 對話框以 v-if 顯示，directive 的 mounted / beforeUnmount 正好對應開啟與關閉。
 * 疊在上面的對話框（例如對話框裡再跳出確認框）優先處理按鍵。
 */
import type { Directive } from 'vue'

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(',')

interface OpenDialog {
  el: HTMLElement
  close: () => void
  /** Focused element before the dialog opened, to give focus back on close */
  returnTo: Element | null
}

/** Open dialogs, topmost last */
const stack: OpenDialog[] = []

function focusables(el: HTMLElement): HTMLElement[] {
  return [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (e) => e.getClientRects().length > 0
  )
}

function initialFocus(el: HTMLElement): HTMLElement {
  return (
    el.querySelector<HTMLElement>('[autofocus]') ??
    focusables(el).find((e) => e.matches('input, select, textarea')) ??
    focusables(el)[0] ??
    el
  )
}

function onKeydown(e: KeyboardEvent) {
  const top = stack.at(-1)
  if (!top) return
  if (e.key === 'Escape') {
    e.preventDefault()
    top.close()
    return
  }
  if (e.key !== 'Tab') return

  const items = focusables(top.el)
  const active = document.activeElement
  if (items.length === 0) {
    e.preventDefault()
    top.el.focus()
    return
  }
  const first = items[0]
  const last = items[items.length - 1]
  if (!(active instanceof Node) || !top.el.contains(active)) {
    e.preventDefault()
    ;(e.shiftKey ? last : first).focus()
  } else if (e.shiftKey && (active === first || active === top.el)) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault()
    first.focus()
  }
}

const dialogs = new WeakMap<HTMLElement, OpenDialog>()

export const vDialog: Directive<HTMLElement, () => void> = {
  mounted(el, binding) {
    const dialog: OpenDialog = { el, close: binding.value, returnTo: document.activeElement }
    dialogs.set(el, dialog)
    stack.push(dialog)
    if (stack.length === 1) document.addEventListener('keydown', onKeydown)
    // Lets the dialog itself take focus when it has nothing focusable
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    initialFocus(el).focus({ preventScroll: true })
  },
  updated(el, binding) {
    const dialog = dialogs.get(el)
    if (dialog) dialog.close = binding.value
  },
  beforeUnmount(el) {
    const dialog = dialogs.get(el)
    if (!dialog) return
    dialogs.delete(el)
    const i = stack.indexOf(dialog)
    if (i !== -1) stack.splice(i, 1)
    if (stack.length === 0) document.removeEventListener('keydown', onKeydown)
    const back = dialog.returnTo
    if (back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true })
  }
}
