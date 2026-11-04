<template>
  <!-- DEDICATED HIGH-FIDELITY HTML PRINT TEMPLATE -->
  <!-- Teleport 到 body 以避開列印時 #app-container display:none 的限制 -->
  <Teleport to="body">
    <div class="print-page-layout print-only">
      <div class="print-container">
        <!-- Banner Header -->
        <div class="print-banner">
          <div class="print-banner-logo">{{ $t('student.shining.printBannerLogo') }}</div>
          <div class="print-banner-sub">{{ $t('student.shining.printBannerSub') }}</div>
        </div>

        <!-- Grid Row 1: Basic Info & Phase 1 Check list -->
        <div class="print-flex-row mt-4">
          <!-- Basic Info Box -->
          <div class="print-box print-w-45">
            <h4 aria-level="3" class="print-box-title">
              {{ $t('student.shining.printBasicTitle') }}
            </h4>
            <div class="print-box-content">
              <p class="print-info-line">
                <span>✦ {{ $t('student.shining.fieldName') }}</span
                ><strong>{{ shiningProject.name || '____________' }}</strong>
              </p>
              <p class="print-info-line">
                <span>✦ {{ $t('student.shining.fieldBirthday') }}</span
                ><strong>{{ shiningProject.birthday || '____________' }}</strong>
              </p>
              <p class="print-info-line">
                <span>✦ {{ $t('student.shining.fieldChurch') }}</span
                ><strong>{{ shiningProject.church || '____________' }}</strong>
              </p>
              <p class="print-info-line">
                <span>✦ {{ $t('student.shining.fieldSchool') }}</span
                ><strong>{{ shiningProject.schoolGrade || '____________' }}</strong>
              </p>
            </div>
          </div>

          <!-- Phase 1 Checklist Box -->
          <div class="print-box print-w-50">
            <h4 aria-level="3" class="print-box-title">
              {{ $t('student.shining.printPhase1Title') }}
            </h4>
            <div class="print-box-content print-checklist">
              <div v-for="(label, key) in phase1Labels" :key="key" class="print-check-line">
                <span
                  class="print-check-circle"
                  :class="{ checked: shiningProject.faithPhase1[key] }"
                >
                  {{ shiningProject.faithPhase1[key] ? '✓' : '' }}
                </span>
                <span class="print-check-text">{{ label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Grid Row 2: Phase 2 Checklist & Advanced Challenges -->
        <div class="print-flex-row mt-4">
          <!-- Phase 2 Checklist Box -->
          <div class="print-box print-w-48">
            <h4 aria-level="3" class="print-box-title">
              {{ $t('student.shining.printPhase2Title') }}
            </h4>
            <div class="print-box-content print-checklist">
              <template v-for="(label, key) in phase2Labels" :key="key">
                <div class="print-check-line">
                  <span class="print-check-circle" :class="{ checked: isPhase2Checked(key) }">
                    {{ isPhase2Checked(key) ? '✓' : '' }}
                  </span>
                  <span v-if="key === 'courses30'" class="print-check-text">
                    {{ $t('student.shining.printPhase2Progress', { count: completedCount }) }}
                  </span>
                  <span v-else class="print-check-text">{{ label }}</span>
                </div>
              </template>
            </div>
          </div>

          <!-- Advanced Challenges Box -->
          <div class="print-box print-w-48">
            <h4 aria-level="3" class="print-box-title">
              {{ $t('student.shining.printAdvancedTitle') }}
            </h4>
            <div class="print-box-content print-checklist">
              <div v-for="(label, key) in advancedLabels" :key="key" class="print-check-line">
                <span
                  class="print-check-circle"
                  :class="{ checked: shiningProject.advancedChallenges[key] }"
                >
                  {{ shiningProject.advancedChallenges[key] ? '✓' : '' }}
                </span>
                <span v-if="key === 'custom'" class="print-check-text">
                  {{ shiningProject.customChallenge || $t('student.shining.printCustomEmpty') }}
                </span>
                <span v-else class="print-check-text">{{ label }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Table 1: Character -->
        <div class="print-table-box mt-4">
          <h4 aria-level="3" class="print-box-title">
            {{ $t('student.shining.printCharacterTitle') }}
          </h4>
          <p class="print-box-subtitle">{{ $t('student.shining.characterSubtitle') }}</p>
          <table class="print-table">
            <thead>
              <tr>
                <th>{{ $t('student.shining.colTheme') }}</th>
                <th>{{ $t('student.shining.colLecturer') }}</th>
                <th>{{ $t('student.shining.colDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(theme, index) in characterThemes" :key="index">
                <td>✦ {{ theme }}</td>
                <td>{{ shiningProject.characterLectures[theme]?.speaker || '' }}</td>
                <td>{{ shiningProject.characterLectures[theme]?.date || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Table 2: Coming of Age -->
        <div class="print-table-box mt-4">
          <h4 aria-level="3" class="print-box-title">
            {{ $t('student.shining.printComingOfAgeTitle') }}
          </h4>
          <p class="print-box-subtitle">{{ $t('student.shining.comingOfAgeSubtitle') }}</p>
          <table class="print-table">
            <thead>
              <tr>
                <th>{{ $t('student.shining.colTheme') }}</th>
                <th>{{ $t('student.shining.colLecturer') }}</th>
                <th>{{ $t('student.shining.colDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(theme, index) in comingOfAgeThemes" :key="index">
                <td>✦ {{ theme }}</td>
                <td>{{ shiningProject.comingOfAgeTopics[theme]?.speaker || '' }}</td>
                <td>{{ shiningProject.comingOfAgeTopics[theme]?.date || '' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Bottom Signatures row -->
        <div class="print-signatures-box mt-4">
          <h4 aria-level="3" class="print-box-title">
            {{ $t('student.shining.printSignaturesTitle') }}
          </h4>
          <div class="print-signatures-row mt-2">
            <div class="print-sig-col">
              <span class="print-sig-lbl">{{ $t('student.shining.printSigTeacher') }}</span>
              <div class="print-sig-space">{{ assignedTeacher }}</div>
            </div>
            <div class="print-sig-col">
              <span class="print-sig-lbl">{{ $t('student.shining.printSigPastor') }}</span>
              <div class="print-sig-space">{{ assignedPastor }}</div>
            </div>
            <div class="print-sig-col">
              <span class="print-sig-lbl">{{ $t('student.shining.printSigParent') }}</span>
              <div class="print-sig-space">{{ assignedParent }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 閃耀計畫的列印版：平常隱藏，按「匯出／列印」時才顯示。內容與畫面上的
 * 閃耀計畫相同，另加教師、牧者、家長的簽名欄。
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useShiningProject } from '@/composables/useShiningProject'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const {
  shiningProject,
  characterThemes,
  comingOfAgeThemes,
  completedCount,
  isPhase2Checked,
  phase1Labels,
  phase2Labels,
  advancedLabels
} = useShiningProject()

const username = computed(() => authStore.currentUser?.username || '')

// Who signs the printed sheet
const assignedTeacher = computed(() => coursesStore.getStudentCaretaker(username.value, 'teacher'))
const assignedPastor = computed(() => coursesStore.getStudentCaretaker(username.value, 'pastor'))
const assignedParent = computed(() => authStore.parentsOf(username.value).join('、'))
</script>

<!-- 不使用 scoped，因為 Teleport 的 print-only 掛載在 body，scoped 無法命中；
     版面樣式在 StudentDashboard.vue 的列印區塊 -->
<style>
/*
 * Intentionally global: used by several components, element selectors / keyframes,
 * or rules whose look depends on cascade order against main.css and other global
 * styles (scoping would raise their specificity and change what wins).
 *
 * Every selector is guarded by :where(body:has(.student-dashboard)) so these rules only apply
 * while that page is on screen; otherwise they would keep applying to other pages
 * after the user switches account in the same tab. :where() adds no specificity.
 */
/* 平常瀏覽時隱藏列印模板 */
:where(body:has(.student-dashboard)) .print-page-layout.print-only {
  display: none;
}

/* 列印時強制顯示 */
@media print {
  :where(body:has(.student-dashboard)) .print-page-layout.print-only {
    display: block !important;
  }
}
</style>
