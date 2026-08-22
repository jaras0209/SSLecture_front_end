/**
 * @file useToast.ts
 * @description 輕量 toast 通知 composable，替換原生 alert/confirm。
 */

import { ref } from 'vue'

export type ToastType = 'success' | 'warning' | 'error' | 'info'

export interface ToastMessage {
  id: number
  text: string
  type: ToastType
}

export interface ConfirmState {
  visible: boolean
  message: string
  resolve: ((ok: boolean) => void) | null
}

// Global singleton state
const _toasts = ref<ToastMessage[]>([])
let _idCounter = 0

const _confirm = ref<ConfirmState>({
  visible: false,
  message: '',
  resolve: null,
})

/** Used by ToastProvider component in App.vue */
export function useToastProvider() {
  return { toasts: _toasts, confirmState: _confirm }
}

/** Use in any component to show toasts or confirm dialogs */
export function useToast() {
  function toast(text: string, type: ToastType = 'success', duration = 3000) {
    const id = ++_idCounter
    _toasts.value.push({ id, text, type })
    setTimeout(() => {
      _toasts.value = _toasts.value.filter((t) => t.id !== id)
    }, duration)
  }

  // 語意捷徑方法（避免每次手動傳第二個參數）
  const success = (text: string, duration?: number) => toast(text, 'success', duration)
  const error   = (text: string, duration?: number) => toast(text, 'error',   duration)
  const warning = (text: string, duration?: number) => toast(text, 'warning', duration)
  const info    = (text: string, duration?: number) => toast(text, 'info',    duration)

  function confirm(message: string): Promise<boolean> {
    return new Promise((resolve) => {
      // 若有前一個 confirm 尚未解決，先自動以 false 取消（防止 Promise 記憶體洩漏）
      if (_confirm.value.resolve) {
        _confirm.value.resolve(false)
      }
      _confirm.value = { visible: true, message, resolve }
    })
  }

  return { toast, success, error, warning, info, confirm }
}

/** Called by the UI confirm dialog when user clicks OK/Cancel */
export function resolveConfirm(result: boolean) {
  _confirm.value.resolve?.(result)
  _confirm.value = { visible: false, message: '', resolve: null }
}

