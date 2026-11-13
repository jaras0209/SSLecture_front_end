/**
 * @file src/composables/usePageTitle.ts
 * @description Gives each page its own browser title (tab, history, bookmarks), in the current
 * language. A single-page app otherwise keeps one title throughout, so screen reader users
 * can't tell from it where they are (WCAG 2.4.2 Page Titled).
 */

import { watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'

export const APP_NAME = 'Shining Star'

/** Title of the page, e.g. "學習與檢視 - Shining Star"; the app's full name when unknown */
export function usePageTitle(): void {
  const route = useRoute()
  const { t } = useI18n()

  // Literal keys, so the translation-key test checks that each one exists
  const pages: Record<string, () => string> = {
    Login: () => t('pageTitle.login'),
    LoginCallback: () => t('pageTitle.callback'),
    Onboarding: () => t('pageTitle.onboarding'),
    StudentDashboard: () => t('pageTitle.student'),
    TeacherDashboard: () => t('pageTitle.teacher'),
    AdminDashboard: () => t('pageTitle.admin'),
    ChangePassword: () => t('pageTitle.changePassword'),
    Unauthorized: () => t('pageTitle.unauthorized'),
    NotFound: () => t('pageTitle.notFound')
  }

  watchEffect(() => {
    const page = pages[String(route.name)]?.()
    document.title = page ? `${page} - ${APP_NAME}` : `${APP_NAME} - ${t('pageTitle.app')}`
  })
}
