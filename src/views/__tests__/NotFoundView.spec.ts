import { describe, it, expect } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import NotFoundView from '@/views/NotFoundView.vue'
import { mountWith, t } from '@/__tests__/helpers'

describe('NotFoundView', () => {
  it('says the page does not exist and offers the way home', async () => {
    const { wrapper, router } = mountWith(NotFoundView)
    await router.push('/no-such-page')
    expect(wrapper.find('h1').text()).toBe('404')
    expect(wrapper.find('h2').text()).toBe(t('notFound.title'))
    expect(wrapper.text()).toContain(t('notFound.desc'))

    const home = wrapper.find('button')
    expect(home.text()).toBe(t('notFound.goHome'))
    await home.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/')
  })
})
