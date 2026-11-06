import { vi } from 'vitest'
/**
 * Shared helpers for component and composable tests.
 */
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'
import { mount, type ComponentMountingOptions } from '@vue/test-utils'
import { defineComponent, h, type Component } from 'vue'
import i18n from '@/i18n'
import { useToastProvider } from '@/composables/useToast'

/** A router with a single placeholder route, enough for components that call router.push('/') */
export function testRouter(): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:pathMatch(.*)*', component: { render: () => null } }]
  })
}

/** Fresh Pinia (activated) + router, plus the plugins a component needs to mount */
export function setup() {
  localStorage.clear()
  const pinia: Pinia = createPinia()
  setActivePinia(pinia)
  const router = testRouter()
  useToastProvider().toasts.value = []
  return { pinia, router, plugins: [pinia, router, i18n] }
}

/** Mount a component with Pinia, a test router and the app's i18n instance */
export function mountWith<C extends Component>(
  component: C,
  options: ComponentMountingOptions<C> = {} as ComponentMountingOptions<C>
) {
  const { pinia, router, plugins } = setup()
  const wrapper = mount(component, {
    ...options,
    global: { ...options.global, plugins: [...plugins, ...(options.global?.plugins ?? [])] }
  } as ComponentMountingOptions<C>)
  return { wrapper, pinia, router }
}

/**
 * Like mountWith, but runs `prepare` (e.g. signing someone in, seeding stores) after the
 * fresh Pinia is active and before mounting — for pages that read state while setting up
 */
export function mountPrepared<C extends Component>(
  component: C,
  prepare: () => void,
  options: ComponentMountingOptions<C> = {} as ComponentMountingOptions<C>
) {
  const { pinia, router, plugins } = setup()
  prepare()
  const wrapper = mount(component, {
    ...options,
    global: { ...options.global, plugins: [...plugins, ...(options.global?.plugins ?? [])] }
  } as ComponentMountingOptions<C>)
  return { wrapper, pinia, router }
}

/** Run a composable inside a component's setup() so inject()/useI18n() work */
export function withSetup<T>(composable: () => T): T {
  let result!: T
  mountWith(
    defineComponent({
      setup() {
        result = composable()
        return () => h('div')
      }
    })
  )
  return result
}

/** Messages of the toasts currently shown */
export function toastTexts(): string[] {
  return useToastProvider().toasts.value.map((t) => t.text)
}

/** Translate with the app's i18n instance (zh-TW unless a test switched it) */
export const t = (key: string, values: Record<string, unknown> = {}) =>
  (i18n.global.t as (k: string, v: Record<string, unknown>) => string)(key, values)

/**
 * Make the browser refuse every localStorage write from now on, as when storage is full,
 * blocked or in some private windows (undo with vi.unstubAllGlobals()). Reads still work.
 */
export function refuseStorageWrites() {
  const real = localStorage
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => real.getItem(key),
    removeItem: (key: string) => real.removeItem(key),
    key: (i: number) => real.key(i),
    get length() {
      return real.length
    },
    clear: () => real.clear(),
    setItem: () => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError')
    }
  })
}
