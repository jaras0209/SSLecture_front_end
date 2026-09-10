<template>
  <!-- Student Detail Drawer -->
  <section v-if="student" class="student-details-drawer glass-panel">
    <div class="drawer-header">
      <div class="student-profile">
        <img :src="student.avatarUrl" class="avatar-md" alt="Avatar" />
        <div>
          <h4>
            {{ student.realName || student.username }}
            <span v-if="student.realName" class="student-id-tag-sm">@{{ student.username }}</span>
          </h4>
          <p>{{ $t('teacher.studentList.progress') }}：{{ student.totalProgressPercent }}%</p>
        </div>
      </div>
      <button @click="emit('close')" class="close-btn">×</button>
    </div>

    <!-- Tab switches inside drawer -->
    <div class="drawer-tabs mt-4">
      <button
        class="drawer-tab-btn"
        @click="emit('open-notes', student)"
      >
        {{ $t('teacher.drawer.openNotesBtn') }}
      </button>
      <button
        :class="['drawer-tab-btn', { active: activeDrawerTab === 'shining' }]"
        @click="activeDrawerTab = 'shining'"
      >
        {{ $t('teacher.drawer.shiningAuditBtn') }}
      </button>
    </div>

    <div class="drawer-body mt-2">
      <!-- Shining Audit Panel -->
      <div v-if="activeDrawerTab === 'shining'" class="shining-audit-panel">
        <div class="flex justify-between align-center mb-4">
          <h5 class="section-title mb-0">✨ {{ $t('teacher.drawer.shiningAuditBtn') }}</h5>
          <button class="btn btn-primary btn-sm" @click="triggerPrint(student.username)">
            {{ $t('teacher.drawer.printBtn') }}
          </button>
        </div>

        <!-- Read Only Basic Info -->
        <div class="basic-info-readonly-card mb-4">
          <h6>📋 {{ $t('teacher.studentList.studentInfo') }}</h6>
          <div class="readonly-grid mt-2">
            <div><span>{{ $t('profile.name') }}：</span><strong>{{ getShining(student.username).name || $t('teacher.booking.notFilled') }}</strong></div>
            <div><span>{{ $t('profile.birthday') }}：</span><strong>{{ getShining(student.username).birthday || $t('teacher.booking.notFilled') }}</strong></div>
            <div><span>{{ $t('profile.church') }}：</span><strong>{{ getShining(student.username).church || $t('teacher.booking.notFilled') }}</strong></div>
            <div><span>{{ $t('profile.grade') }}：</span><strong>{{ getShining(student.username).schoolGrade || $t('teacher.booking.notFilled') }}</strong></div>
          </div>
        </div>

        <!-- Read Only Checklist Statuses -->
        <div class="checklists-readonly-container mb-4">
          <h6>🌟 {{ $t('teacher.studentList.faithChallenge') }}</h6>
          <div class="checklist-grid mt-2">
            <!-- Phase 1 -->
            <div class="checklist-ro-column">
              <div class="checklist-ro-title">{{ $t('teacher.studentList.faithPhase1') }}</div>
              <div class="checklist-ro-list">
                <div
                  v-for="(label, key) in phase1Labels"
                  :key="key"
                  :class="['ro-check-row', { active: getShining(student.username).faithPhase1[key] }]"
                >
                  <span>{{ getShining(student.username).faithPhase1[key] ? '✅' : '❌' }}</span>
                  <span class="text-ro">{{ label }}</span>
                </div>
              </div>
            </div>

            <!-- Phase 2 -->
            <div class="checklist-ro-column">
              <div class="checklist-ro-title">{{ $t('teacher.studentList.faithPhase2') }}</div>
              <div class="checklist-ro-list">
                <template v-for="(label, key) in phase2Labels" :key="key">
                  <div :class="['ro-check-row', { active: getShining(student.username).faithPhase2[key] }]">
                    <span>{{ getShining(student.username).faithPhase2[key] ? '✅' : '❌' }}</span>
                    <span class="text-ro" v-if="key === 'courses30'">
                      {{ $t('teacher.studentList.completedCourses', { count: student.completedCount }) }}
                    </span>
                    <span class="text-ro" v-else>{{ label }}</span>
                  </div>
                </template>
              </div>
            </div>

            <!-- Challenges -->
            <div class="checklist-ro-column">
              <div class="checklist-ro-title">{{ $t('teacher.studentList.advancedChallenges') }}</div>
              <div class="checklist-ro-list">
                <div
                  v-for="(label, key) in advancedLabels"
                  :key="key"
                  :class="['ro-check-row', { active: getShining(student.username).advancedChallenges[key] }]"
                >
                  <span>{{ getShining(student.username).advancedChallenges[key] ? '✅' : '❌' }}</span>
                  <span class="text-ro" v-if="key === 'custom'">
                    {{ $t('teacher.studentList.customChallenge') }}{{ getShining(student.username).customChallenge || $t('teacher.booking.notFilled') }}
                  </span>
                  <span class="text-ro" v-else>{{ label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Editable Lecture Logs -->
        <div class="lectures-edit-section">
          <!-- Character Tables -->
          <div class="lecture-edit-group mb-4">
            <h6>📖 {{ $t('teacher.studentList.characterThemes') }}</h6>
            <div class="lecture-inputs-stack mt-2">
              <div
                v-for="theme in characterThemes"
                :key="theme"
                class="lecture-edit-row"
              >
                <div class="row-theme-name">✦ {{ theme }}</div>

                <!-- Editable row for teachers/admins/pastors -->
                <div class="inputs-row" v-if="authStore.currentUser?.role !== 'parent'">
                  <input
                    type="text"
                    v-model="lectureForms[theme].speaker"
                    class="form-input text-xs pt-1 pb-1"
                    :placeholder="$t('teacher.drawer.lecturerPlaceholder')"
                  />
                  <input
                    type="date"
                    v-model="lectureForms[theme].date"
                    class="form-input text-xs pt-1 pb-1"
                  />
                  <button
                    @click="saveLectureRow(student.username, 'character', theme)"
                    class="btn btn-secondary btn-sm pt-1 pb-1"
                  >
                    {{ $t('teacher.drawer.saveLectureBtn') }}
                  </button>
                </div>

                <!-- Readonly row for parents -->
                <div class="inputs-row-readonly text-sm" v-else>
                  <span v-if="lectureForms[theme]?.speaker" class="mr-4">{{ $t('teacher.drawer.lecturerLabel') }}<strong>{{ lectureForms[theme].speaker }}</strong></span>
                  <span v-if="lectureForms[theme]?.date">{{ $t('teacher.drawer.dateLabel') }}<strong>{{ lectureForms[theme].date }}</strong></span>
                  <span v-if="!lectureForms[theme]?.speaker && !lectureForms[theme]?.date" class="text-muted text-xs italic">{{ $t('teacher.drawer.notRegistered') }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Coming of Age Tables -->
          <div class="lecture-edit-group mb-4">
            <h6>🎓 {{ $t('teacher.studentList.comingOfAgeThemes') }}</h6>
            <div class="lecture-inputs-stack mt-2">
              <div
                v-for="theme in comingOfAgeThemes"
                :key="theme"
                class="lecture-edit-row"
              >
                <div class="row-theme-name">✦ {{ theme }}</div>

                <!-- Editable row for teachers/admins/pastors -->
                <div class="inputs-row" v-if="authStore.currentUser?.role !== 'parent'">
                  <input
                    type="text"
                    v-model="lectureForms[theme].speaker"
                    class="form-input text-xs pt-1 pb-1"
                    :placeholder="$t('teacher.drawer.lecturerPlaceholder')"
                  />
                  <input
                    type="date"
                    v-model="lectureForms[theme].date"
                    class="form-input text-xs pt-1 pb-1"
                  />
                  <button
                    @click="saveLectureRow(student.username, 'comingOfAge', theme)"
                    class="btn btn-secondary btn-sm pt-1 pb-1"
                  >
                    {{ $t('teacher.drawer.saveLectureBtn') }}
                  </button>
                </div>

                <!-- Readonly row for parents -->
                <div class="inputs-row-readonly text-sm" v-else>
                  <span v-if="lectureForms[theme]?.speaker" class="mr-4">{{ $t('teacher.drawer.lecturerLabel') }}<strong>{{ lectureForms[theme].speaker }}</strong></span>
                  <span v-if="lectureForms[theme]?.date">{{ $t('teacher.drawer.dateLabel') }}<strong>{{ lectureForms[theme].date }}</strong></span>
                  <span v-if="!lectureForms[theme]?.speaker && !lectureForms[theme]?.date" class="text-muted text-xs italic">{{ $t('teacher.drawer.notRegistered') }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Empty state when no student selected -->
  <section v-else class="student-details-drawer empty-drawer glass-panel text-center no-print">
    <div class="empty-illustration">👩‍🏫🎓</div>
    <h4>{{ $t('teacher.drawer.emptyTitle') }}</h4>
    <p>{{ $t('teacher.drawer.emptyDesc') }}</p>
  </section>

  <!-- HIGH-FIDELITY PRINT LAYOUT (Hidden on screen) -->
  <!-- Teleport 到 body 以避免被 #app-container display:none 遮蔽 -->
  <Teleport to="body">
    <div v-if="student" class="print-page-layout print-only">
    <div class="print-container">
      <!-- Banner Header -->
      <div class="print-banner">
        <div class="print-banner-logo">SS閃耀計畫</div>
        <div class="print-banner-sub">SHINING PROJECT</div>
      </div>

      <!-- Grid Row 1: Basic Info & Phase 1 -->
      <div class="print-flex-row mt-4">
        <div class="print-box print-w-45">
          <h4 class="print-box-title">【基本資料】</h4>
          <div class="print-box-content">
            <p class="print-info-line"><span>✦ 姓名：</span><strong>{{ getShining(student.username).name || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ 生日：</span><strong>{{ getShining(student.username).birthday || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ 教會：</span><strong>{{ getShining(student.username).church || '____________' }}</strong></p>
            <p class="print-info-line"><span>✦ 學校/年級：</span><strong>{{ getShining(student.username).schoolGrade || '____________' }}</strong></p>
          </div>
        </div>

        <div class="print-box print-w-50">
          <h4 class="print-box-title">【信仰指標 PHASE 1】</h4>
          <div class="print-box-content print-checklist">
            <div v-for="(label, key) in phase1Labels" :key="key" class="print-check-line">
              <span class="print-check-circle" :class="{ checked: getShining(student.username).faithPhase1[key] }">
                {{ getShining(student.username).faithPhase1[key] ? '✓' : '' }}
              </span>
              <span class="print-check-text">{{ label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Grid Row 2: Phase 2 & Advanced Challenges -->
      <div class="print-flex-row mt-4">
        <div class="print-box print-w-48">
          <h4 class="print-box-title">【信仰指標 PHASE 2】</h4>
          <div class="print-box-content print-checklist">
            <template v-for="(label, key) in phase2Labels" :key="key">
              <div class="print-check-line">
                <span class="print-check-circle" :class="{ checked: getShining(student.username).faithPhase2[key] }">
                  {{ getShining(student.username).faithPhase2[key] ? '✓' : '' }}
                </span>
                <span class="print-check-text" v-if="key === 'courses30'">
                  我已經聽完 30 個論 (聽課數: {{ student.completedCount }}/30)
                </span>
                <span class="print-check-text" v-else>{{ label }}</span>
              </div>
            </template>
          </div>
        </div>

        <div class="print-box print-w-48">
          <h4 class="print-box-title">【進階挑戰】</h4>
          <div class="print-box-content print-checklist">
            <div v-for="(label, key) in advancedLabels" :key="key" class="print-check-line">
              <span class="print-check-circle" :class="{ checked: getShining(student.username).advancedChallenges[key] }">
                {{ getShining(student.username).advancedChallenges[key] ? '✓' : '' }}
              </span>
              <span class="print-check-text" v-if="key === 'custom'">
                {{ getShining(student.username).customChallenge || '自訂挑戰項目（未填寫）' }}
              </span>
              <span class="print-check-text" v-else>{{ label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Table 1: Character -->
      <div class="print-table-box mt-4">
        <h4 class="print-box-title">【不分階專題課：品格力】</h4>
        <p class="print-box-subtitle">&lt;言語和行動&gt;會展現「人格」。在「人格」之上才有「信仰」和「主的話語」。</p>
        <table class="print-table">
          <thead><tr><th>主題</th><th>講師</th><th>上課日期</th></tr></thead>
          <tbody>
            <tr v-for="(theme, index) in characterThemes" :key="index">
              <td>✦ {{ theme }}</td>
              <td>{{ getShining(student.username).characterLectures[theme]?.speaker || '' }}</td>
              <td>{{ getShining(student.username).characterLectures[theme]?.date || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Table 2: Coming of Age -->
      <div class="print-table-box mt-4">
        <h4 class="print-box-title">【成年禮必修專題課】</h4>
        <p class="print-box-subtitle">向我學習後，也像這樣絕對相信、堅定地生活吧！</p>
        <table class="print-table">
          <thead><tr><th>主題</th><th>講師</th><th>上課日期</th></tr></thead>
          <tbody>
            <tr v-for="(theme, index) in comingOfAgeThemes" :key="index">
              <td>✦ {{ theme }}</td>
              <td>{{ getShining(student.username).comingOfAgeTopics[theme]?.speaker || '' }}</td>
              <td>{{ getShining(student.username).comingOfAgeTopics[theme]?.date || '' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Signatures -->
      <div class="print-signatures-box mt-4">
        <h4 class="print-box-title">【審核簽名】</h4>
        <div class="print-signatures-row mt-2">
          <div class="print-sig-col">
            <span class="print-sig-lbl">✦ 教師</span>
            <div class="print-sig-space">{{ coursesStore.getStudentCaretaker(student.username, 'teacher') }}</div>
          </div>
          <div class="print-sig-col">
            <span class="print-sig-lbl">✦ 牧者</span>
            <div class="print-sig-space">{{ coursesStore.getStudentCaretaker(student.username, 'pastor') }}</div>
          </div>
          <div class="print-sig-col">
            <span class="print-sig-lbl">✦ 家長/導師</span>
            <div class="print-sig-space">{{ coursesStore.getStudentCaretaker(student.username, 'parent') }}</div>
          </div>
        </div>
      </div>
    </div>
    </div>
  </Teleport>
</template>

<style>
/* 螢幕上隱藏列印模板 */
.print-page-layout.print-only {
  display: none;
}
/* 列印時顯示（Teleport 到 body 後可正常運作） */
@media print {
  .print-page-layout.print-only {
    display: block !important;
  }
}
</style>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
const { toast } = useToast()
const { t } = useI18n()
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { StudentProgressSummary } from './TeacherStudentList.vue'

// ── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  student: StudentProgressSummary | null
}>()

const emit = defineEmits<{
  close: []
  'open-notes': [student: StudentProgressSummary]
}>()

// ── Stores ────────────────────────────────────────────────────────────────────

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

// ── Drawer State ──────────────────────────────────────────────────────────────

const activeDrawerTab = ref<'notes' | 'shining'>('shining')
const lectureForms = ref<Record<string, { speaker: string; date: string }>>({})

// ── Context Church (for themes) ───────────────────────────────────────────────

const currentContextChurch = computed(() => {
  return authStore.currentUser?.role === 'admin'
    ? (authStore.currentUser?.church || '愛與話語')
    : (authStore.currentUser?.church || '愛與話語')
})

const characterThemes = computed(() => coursesStore.getThemesByChurch('character', currentContextChurch.value))
const comingOfAgeThemes = computed(() => coursesStore.getThemesByChurch('comingOfAge', currentContextChurch.value))

// ── Watch Student Changes → Re-init forms ────────────────────────────────────

watch(() => props.student, (newStudent) => {
  if (newStudent) {
    activeDrawerTab.value = 'shining'
    initShiningForm(newStudent.username)
  }
}, { immediate: true })

// ── Helpers ───────────────────────────────────────────────────────────────────

function getShining(username: string) {
  return coursesStore.getShiningProject(username)
}

function initShiningForm(username: string) {
  const proj = coursesStore.getShiningProject(username)
  const form: Record<string, { speaker: string; date: string }> = {}
  const allThemes = [...characterThemes.value, ...comingOfAgeThemes.value]
  allThemes.forEach(theme => {
    const charLecture = proj.characterLectures[theme]
    const ageLecture = proj.comingOfAgeTopics[theme]
    form[theme] = {
      speaker: charLecture?.speaker || ageLecture?.speaker || '',
      date: charLecture?.date || ageLecture?.date || ''
    }
  })
  lectureForms.value = form
}

function saveLectureRow(username: string, type: 'character' | 'comingOfAge', theme: string) {
  const row = lectureForms.value[theme]
  if (!row) return
  coursesStore.updateShiningLecture(username, type, theme, row.speaker, row.date)
  toast(`✓ ${theme} ${t('teacher.drawer.saveLectureBtn')}！`)
}

function triggerPrint(_username: string) {
  window.print()
}


// ── Static Checklist Labels ───────────────────────────────────────────────────

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
