/**
 * 目前登入學員的閃耀計畫：資料、本教會的專題講座主題、課程完成數與檢核項目名稱。
 * 閃耀計畫頁與它的列印版共用。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore, type ShiningChecklistKey } from '@/stores/courses'
import { DEFAULT_CHURCH } from '@/types/auth'

export function useShiningProject() {
  const { t } = useI18n()
  const authStore = useAuthStore()
  const coursesStore = useCoursesStore()

  const username = computed(() => authStore.currentUser?.username || '')
  const church = computed(() => authStore.currentUser?.church || DEFAULT_CHURCH)

  const shiningProject = computed(() => coursesStore.getShiningProject(username.value))

  const characterThemes = computed(() => coursesStore.getThemesByChurch('character', church.value))
  const comingOfAgeThemes = computed(() =>
    coursesStore.getThemesByChurch('comingOfAge', church.value)
  )

  /** For the Phase 2 progress bar */
  const completedCount = computed(() => coursesStore.getCompletedCourseCount(username.value))

  /** Phase 2 items, including courses30 which is auto-checked once all courses are done */
  function isPhase2Checked(key: ShiningChecklistKey): boolean {
    return coursesStore.isShiningChecked(username.value, 'faithPhase2', key)
  }

  const phase1Labels = computed(() => ({
    worship: t('teacher.studentList.phase1Worship'),
    prayer: t('teacher.studentList.phase1Prayer'),
    independent: t('teacher.studentList.phase1Independent'),
    reply: t('teacher.studentList.phase1Reply'),
    share: t('teacher.studentList.phase1Share')
  }))

  const phase2Labels = computed(() => ({
    courses30: t('teacher.studentList.phase2Courses30'),
    prayerLong: t('teacher.studentList.phase2PrayerLong'),
    morningWorship: t('teacher.studentList.phase2MorningWorship'),
    readBible: t('teacher.studentList.phase2ReadBible'),
    churchService: t('teacher.studentList.phase2ChurchService')
  }))

  const advancedLabels = computed(() => ({
    wednesday: t('teacher.studentList.advWednesday'),
    shareFaith: t('teacher.studentList.advShareFaith'),
    copySermon: t('teacher.studentList.advCopySermon'),
    morningProverb: t('teacher.studentList.advMorningProverb'),
    custom: t('teacher.studentList.advCustom')
  }))

  return {
    shiningProject,
    characterThemes,
    comingOfAgeThemes,
    completedCount,
    isPhase2Checked,
    phase1Labels,
    phase2Labels,
    advancedLabels
  }
}
