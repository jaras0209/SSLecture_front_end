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
 * 閃耀計畫相同，另加教師、牧者、家長的簽名欄。學員自己的閃耀計畫頁與
 * 教師的學員抽屜共用；未指定學員時為目前登入的學員。
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useShiningProject } from '@/composables/useShiningProject'
import { useI18nHelper } from '@/composables/useI18nHelper'

const props = defineProps<{ username?: string }>()

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const { tList } = useI18nHelper()
const {
  username,
  shiningProject,
  characterThemes,
  comingOfAgeThemes,
  completedCount,
  isPhase2Checked,
  phase1Labels,
  phase2Labels,
  advancedLabels
} = useShiningProject(() => props.username)

// Who signs the printed sheet
const assignedTeacher = computed(() => coursesStore.getStudentCaretaker(username.value, 'teacher'))
const assignedPastor = computed(() => coursesStore.getStudentCaretaker(username.value, 'pastor'))
const assignedParent = computed(() => tList(authStore.parentsOf(username.value)))
</script>

<!-- 不使用 scoped，因為列印版 Teleport 到 body，scoped 無法命中。
     各頁面在列印時隱藏自己的畫面（見 StudentDashboard / TeacherDashboard 的 @media print） -->
<style>
/*
 * Every selector is guarded by :where(body:has(...)) so these rules only apply while a page
 * that prints the sheet is on screen. :where() adds no specificity.
 */
/* 平常瀏覽時隱藏列印模板 */
:where(body:has(.student-dashboard, .teacher-dashboard)) .print-page-layout.print-only {
  display: none;
}

@media print {
  /* 列印時強制顯示 */
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-page-layout.print-only {
    display: block !important;
  }

  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-page-layout {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 20px;
    background-color: white;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-container {
    border: 3px double #000;
    border-radius: 12px;
    padding: 25px;
    background: white;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-banner {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-banner-logo {
    font-size: 2.2rem;
    font-weight: 700;
    letter-spacing: 2px;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-banner-sub {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 3px;
    color: #444;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-flex-row {
    display: flex;
    justify-content: space-between;
    gap: 15px;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-w-45 {
    width: 45%;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-w-48 {
    width: 48%;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-w-50 {
    width: 50%;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
    background: #fff;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-box-title {
    font-size: 1rem;
    font-weight: 700;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-box-subtitle {
    font-size: 0.75rem;
    color: #555;
    margin-bottom: 8px;
    font-style: italic;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-info-line {
    font-size: 0.9rem;
    margin-bottom: 8px;
    border-bottom: 1px dashed #ddd;
    padding-bottom: 2px;
  }
  /* "Name:" needs a space before the value; the Chinese full-width colon has one built in */
  :where(html:lang(en) body:has(.student-dashboard, .teacher-dashboard)) .print-info-line strong {
    margin-inline-start: 0.35em;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-checklist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-check-line {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-check-circle {
    width: 16px;
    height: 16px;
    border: 1.5px solid #000;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.7rem;
    flex-shrink: 0;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-check-circle.checked {
    background-color: #000;
    color: #fff;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-table-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
    background: #fff;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-table th,
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-table td {
    border: 1px solid #000;
    padding: 6px 10px;
    font-size: 0.85rem;
    text-align: left;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-table th {
    background-color: #f2f2f2;
    font-weight: 700;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-signatures-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-signatures-row {
    display: flex;
    justify-content: space-around;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-sig-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-sig-lbl {
    font-size: 0.85rem;
    font-weight: 700;
  }
  :where(body:has(.student-dashboard, .teacher-dashboard)) .print-sig-space {
    width: 80px;
    height: 50px;
    border: 1.5px dashed #777;
    border-radius: 50%;
  }
}
</style>
