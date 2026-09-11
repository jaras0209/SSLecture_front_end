<template>
  <!-- Shining Dashboard Body -->
  <div class="shining-dashboard-body no-print">
    <!-- Toolbar with export -->
    <div class="shining-toolbar mb-4">
      <h3>{{ $t('student.shining.pageTitle') }}</h3>
      <button class="btn btn-primary btn-sm" @click="triggerPrint">
        {{ $t('student.shining.exportBtn') }}
      </button>
    </div>

    <div class="shining-grid">
      <!-- Row 1: Basic Info & Phase 1 Checklist -->
      <div class="shining-row-cols">
        <!-- Basic Info Form -->
        <div class="glass-panel shining-card-basic">
          <h4 class="shining-card-title">{{ $t('student.shining.basicInfoTitle') }}</h4>
          <div class="basic-info-fields mt-4">
            <div class="form-group-inline">
              <span class="info-dot">✦</span>
              <label class="info-lbl">{{ $t('student.shining.fieldName') }}</label>
              <input v-model="basicInfo.name" type="text" class="form-input-clean" :placeholder="$t('student.shining.fieldNamePlaceholder')" />
            </div>
            <div class="form-group-inline">
              <span class="info-dot">✦</span>
              <label class="info-lbl">{{ $t('student.shining.fieldBirthday') }}</label>
              <input v-model="basicInfo.birthday" type="date" class="form-input-clean" />
            </div>
            <div class="form-group-inline">
              <span class="info-dot">✦</span>
              <label class="info-lbl">{{ $t('student.shining.fieldChurch') }}</label>
              <input v-model="basicInfo.church" type="text" class="form-input-clean" :placeholder="$t('student.shining.fieldChurchPlaceholder')" />
            </div>
            <div class="form-group-inline">
              <span class="info-dot">✦</span>
              <label class="info-lbl">{{ $t('student.shining.fieldSchool') }}</label>
              <input v-model="basicInfo.schoolGrade" type="text" class="form-input-clean" :placeholder="$t('student.shining.fieldSchoolPlaceholder')" />
            </div>
            <div class="text-right mt-2">
              <button class="btn btn-secondary btn-sm" @click="saveBasicInfo">{{ $t('student.shining.saveBasicBtn') }}</button>
              <span v-if="basicSaveMsg" class="save-alert-msg">{{ basicSaveMsg }}</span>
            </div>
          </div>
        </div>

        <!-- Phase 1 Checklist -->
        <div class="glass-panel checklist-card">
          <h4 class="shining-card-title">{{ $t('student.shining.phase1Title') }}</h4>
          <div class="checklist-items mt-4">
            <label
              v-for="(label, key) in phase1Labels"
              :key="key"
              class="check-item-row"
            >
              <div class="check-box-wrapper">
                <input
                  type="checkbox"
                  :checked="shiningProject.faithPhase1[key]"
                  @change="toggleCheck('faithPhase1', key)"
                />
                <span class="styled-checkbox"></span>
              </div>
              <span class="check-label-text">{{ label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Row 2: Phase 2 & Advanced Challenges -->
      <div class="shining-row-cols mt-4">
        <!-- Phase 2 Checklist -->
        <div class="glass-panel checklist-card">
          <h4 class="shining-card-title">{{ $t('student.shining.phase2Title') }}</h4>
          <div class="checklist-items mt-4">
            <template v-for="(label, key) in phase2Labels" :key="key">
              <label
                class="check-item-row"
                :class="{ 'special-progress-row': key === 'courses30' }"
              >
                <div class="check-box-wrapper">
                  <input
                    type="checkbox"
                    :checked="shiningProject.faithPhase2[key]"
                    @change="toggleCheck('faithPhase2', key)"
                  />
                  <span class="styled-checkbox"></span>
                </div>
                <div class="check-label-text-progress" v-if="key === 'courses30'">
                  <span>{{ $t('student.shining.phase2Progress') }}</span>
                  <span class="progress-sub">{{ $t('student.shining.phase2ProgressSub', { count: completedCount }) }}</span>
                </div>
                <span class="check-label-text" v-else>{{ label }}</span>
              </label>
            </template>
          </div>
        </div>

        <!-- Advanced Challenges Checklist -->
        <div class="glass-panel checklist-card">
          <h4 class="shining-card-title">{{ $t('student.shining.advancedTitle') }}</h4>
          <div class="checklist-items mt-4">
            <label
              v-for="(label, key) in advancedLabels"
              :key="key"
              class="check-item-row"
            >
              <div class="check-box-wrapper">
                <input
                  type="checkbox"
                  :checked="shiningProject.advancedChallenges[key]"
                  @change="toggleCheck('advancedChallenges', key)"
                />
                <span class="styled-checkbox"></span>
              </div>
              <!-- Custom item template -->
              <span v-if="key === 'custom'" class="custom-challenge-wrap">
                <input
                  type="text"
                  v-model="customChallengeText"
                  class="form-input-clean-custom"
                  :placeholder="$t('student.shining.customChallengePlaceholder')"
                  @blur="saveCustomChallengeText"
                />
              </span>
              <span v-else class="check-label-text">{{ label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Row 3: Special Lectures Tables -->
      <div class="shining-row-cols-tables mt-4">
        <!-- Character Lectures Table -->
        <div class="glass-panel table-card">
          <div class="table-card-header">
            <h4 class="shining-card-title">{{ $t('student.shining.characterTitle') }}</h4>
            <p class="table-sub-lbl">{{ $t('student.shining.characterSubtitle') }}</p>
          </div>
          <table class="shining-lecture-table mt-4">
            <thead>
              <tr>
                <th style="width: 40%">{{ $t('student.shining.colTheme') }}</th>
                <th style="width: 30%">{{ $t('student.shining.colLecturer') }}</th>
                <th style="width: 30%">{{ $t('student.shining.colDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(theme, index) in characterThemes" :key="index">
                <td class="theme-title-cell">??{{ theme }}</td>
                <td>
                  <span v-if="shiningProject.characterLectures[theme]?.speaker">
                    {{ shiningProject.characterLectures[theme].speaker }}
                  </span>
                  <span v-else class="empty-input-cell">{{ $t('student.shining.pendingTeacher') }}</span>
                </td>
                <td>
                  <span v-if="shiningProject.characterLectures[theme]?.date">
                    {{ shiningProject.characterLectures[theme].date }}
                  </span>
                  <span v-else class="empty-input-cell">{{ $t('student.shining.pendingTeacher') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Coming of Age Lectures Table -->
        <div class="glass-panel table-card mt-4">
          <div class="table-card-header">
            <h4 class="shining-card-title">{{ $t('student.shining.comingOfAgeTitle') }}</h4>
            <p class="table-sub-lbl">{{ $t('student.shining.comingOfAgeSubtitle') }}</p>
          </div>
          <table class="shining-lecture-table mt-4">
            <thead>
              <tr>
                <th style="width: 40%">{{ $t('student.shining.colTheme') }}</th>
                <th style="width: 30%">{{ $t('student.shining.colLecturer') }}</th>
                <th style="width: 30%">{{ $t('student.shining.colDate') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(theme, index) in comingOfAgeThemes" :key="index">
                <td class="theme-title-cell">??{{ theme }}</td>
                <td>
                  <span v-if="shiningProject.comingOfAgeTopics[theme]?.speaker">
                    {{ shiningProject.comingOfAgeTopics[theme].speaker }}
                  </span>
                  <span v-else class="empty-input-cell">{{ $t('student.shining.pendingTeacher') }}</span>
                </td>
                <td>
                  <span v-if="shiningProject.comingOfAgeTopics[theme]?.date">
                    {{ shiningProject.comingOfAgeTopics[theme].date }}
                  </span>
                  <span v-else class="empty-input-cell">{{ $t('student.shining.pendingTeacher') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Signature boxes preview in UI -->
      <div class="glass-panel signatures-card mt-4">
        <h4 class="shining-card-title">{{ $t('student.shining.signaturesTitle') }}</h4>
        <div class="signature-box-preview-container mt-4">
          <div class="sig-box-preview">
            <span class="sig-title-p">{{ $t('student.shining.sigTeacher') }}</span>
            <div class="sig-circle-p">{{ $t('student.shining.sigSpace') }}</div>
          </div>
          <div class="sig-box-preview">
            <span class="sig-title-p">{{ $t('student.shining.sigPastor') }}</span>
            <div class="sig-circle-p">{{ $t('student.shining.sigSpace') }}</div>
          </div>
          <div class="sig-box-preview">
            <span class="sig-title-p">{{ $t('student.shining.sigAdmin') }}</span>
            <div class="sig-circle-p">{{ $t('student.shining.sigSpace') }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- DEDICATED HIGH-FIDELITY HTML PRINT TEMPLATE -->
  <!-- Teleport ??body ?遛蹓?? #app-container display:none ??軋? -->
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
          <h4 class="print-box-title">{{ $t('student.shining.printBasicTitle') }}</h4>
          <div class="print-box-content">
            <p class="print-info-line"><span>✦ {{ $t('student.shining.fieldName') }}</span><strong>{{ shiningProject.name || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ {{ $t('student.shining.fieldBirthday') }}</span><strong>{{ shiningProject.birthday || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ {{ $t('student.shining.fieldChurch') }}</span><strong>{{ shiningProject.church || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ {{ $t('student.shining.fieldSchool') }}</span><strong>{{ shiningProject.schoolGrade || '____________' }}</strong></p>
          </div>
        </div>

        <!-- Phase 1 Checklist Box -->
        <div class="print-box print-w-50">
          <h4 class="print-box-title">{{ $t('student.shining.printPhase1Title') }}</h4>
          <div class="print-box-content print-checklist">
            <div
              v-for="(label, key) in phase1Labels"
              :key="key"
              class="print-check-line"
            >
              <span class="print-check-circle" :class="{ checked: shiningProject.faithPhase1[key] }">
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
          <h4 class="print-box-title">{{ $t('student.shining.printPhase2Title') }}</h4>
          <div class="print-box-content print-checklist">
            <template v-for="(label, key) in phase2Labels" :key="key">
              <div class="print-check-line">
                <span class="print-check-circle" :class="{ checked: shiningProject.faithPhase2[key] }">
                  {{ shiningProject.faithPhase2[key] ? '✓' : '' }}
                </span>
                <span class="print-check-text" v-if="key === 'courses30'">
                  {{ $t('student.shining.printPhase2Progress', { count: completedCount }) }}
                </span>
                <span class="print-check-text" v-else>{{ label }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- Advanced Challenges Box -->
        <div class="print-box print-w-48">
          <h4 class="print-box-title">{{ $t('student.shining.printAdvancedTitle') }}</h4>
          <div class="print-box-content print-checklist">
            <div
              v-for="(label, key) in advancedLabels"
              :key="key"
              class="print-check-line"
            >
              <span class="print-check-circle" :class="{ checked: shiningProject.advancedChallenges[key] }">
                {{ shiningProject.advancedChallenges[key] ? '✓' : '' }}
              </span>
              <span class="print-check-text" v-if="key === 'custom'">
                {{ shiningProject.customChallenge || $t('student.shining.printCustomEmpty') }}
              </span>
              <span class="print-check-text" v-else>{{ label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table 1: Character -->
      <div class="print-table-box mt-4">
        <h4 class="print-box-title">{{ $t('student.shining.printCharacterTitle') }}</h4>
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
        <h4 class="print-box-title">{{ $t('student.shining.printComingOfAgeTitle') }}</h4>
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
        <h4 class="print-box-title">{{ $t('student.shining.printSignaturesTitle') }}</h4>
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
import { ref, computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { ShiningChecklistKey } from '@/stores/courses'

const { t } = useI18n()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()

// ?? Shining Project Data ??????????????????????????????????????????????????????

const shiningProject = computed(() => {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getShiningProject(username)
})

const basicInfo = reactive({
  name: '',
  birthday: '',
  church: '',
  schoolGrade: ''
})

const customChallengeText = ref('')
const basicSaveMsg = ref('')

watch(shiningProject, (newProj) => {
  if (newProj) {
    basicInfo.name = newProj.name || ''
    basicInfo.birthday = newProj.birthday || ''
    basicInfo.church = newProj.church || ''
    basicInfo.schoolGrade = newProj.schoolGrade || ''
    customChallengeText.value = newProj.customChallenge || ''
  }
}, { immediate: true })

// ?? Caretaker Info (for print signatures) ????????????????????????????????????

const assignedTeacher = computed(() => {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentCaretaker(username, 'teacher')
})

const assignedPastor = computed(() => {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentCaretaker(username, 'pastor')
})

const assignedParent = computed(() => {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentCaretaker(username, 'parent')
})

// ?? Themes ????????????????????????????????????????????????????????????????????

const characterThemes = computed(() => {
  const church = authStore.currentUser?.church || '??閰梯?'
  return coursesStore.getThemesByChurch('character', church)
})
const comingOfAgeThemes = computed(() => {
  const church = authStore.currentUser?.church || '??閰梯?'
  return coursesStore.getThemesByChurch('comingOfAge', church)
})

// ?? Course Completion Count (for Phase 2 progress bar) ???????????????????????

const completedCount = computed(() => {
  const username = authStore.currentUser?.username || ''
  const userRecords = coursesStore.progressDb[username]
  if (!userRecords) return 0
  return Object.values(userRecords).filter(r => r.completed).length
})

// ?? Actions ???????????????????????????????????????????????????????????????????

function saveBasicInfo() {
  const username = authStore.currentUser?.username || ''
  coursesStore.updateShiningBasicInfo(username, basicInfo)
  basicSaveMsg.value = t('student.shining.saveMsgSuccess')
  setTimeout(() => { basicSaveMsg.value = '' }, 3000)
}

function toggleCheck(category: 'faithPhase1' | 'faithPhase2' | 'advancedChallenges', key: ShiningChecklistKey) {
  const username = authStore.currentUser?.username || ''
  const checklist = shiningProject.value[category] as Record<string, boolean>
  const currentValue = checklist[key]
  coursesStore.updateShiningChecklist(username, category, key, !currentValue)
}

function saveCustomChallengeText() {
  const username = authStore.currentUser?.username || ''
  coursesStore.updateShiningCustomChallenge(username, customChallengeText.value)
}

function triggerPrint() {
  window.print()
}

// ?? Checklist Labels (i18n computed) ?????????????????????????????????????????

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
</script>

<!-- ??? scoped??eleport ??print-only ????body?coped ???????? -->
<style>
/* ?嚗???謇?????唾???*/
.print-page-layout.print-only {
  display: none;
}

/* ?謅?蹇???*/
@media print {
  .print-page-layout.print-only {
    display: block !important;
  }
}
</style>
