<template>
  <!-- Student Detail Drawer -->
  <section v-if="student" class="student-details-drawer glass-panel">
    <div class="drawer-header">
      <div class="student-profile">
        <img :src="avatarSrc(student.avatarUrl)" class="avatar-md" alt="Avatar" />
        <div>
          <h4 aria-level="2">
            {{ student.realName || student.username }}
            <span v-if="student.realName" class="student-id-tag-sm">@{{ student.username }}</span>
          </h4>
          <p>{{ $t('teacher.studentList.progress') }}：{{ student.totalProgressPercent }}%</p>
        </div>
      </div>
      <button class="close-btn" @click="emit('close')">×</button>
    </div>

    <!-- Tab switches inside drawer -->
    <div class="drawer-tabs mt-4">
      <button class="drawer-tab-btn" @click="emit('open-notes', student)">
        {{ $t('teacher.drawer.openNotesBtn') }}
      </button>
      <button
        :class="['drawer-tab-btn', { active: activeDrawerTab === 'shining' }]"
        @click="activeDrawerTab = 'shining'"
      >
        {{ $t('teacher.drawer.shiningAuditBtn') }}
      </button>
      <button
        id="drawer-tab-bookings"
        :class="['drawer-tab-btn', { active: activeDrawerTab === 'bookings' }]"
        @click="activeDrawerTab = 'bookings'"
      >
        📅 {{ $t('teacher.drawer.bookings.tab') }}
      </button>
    </div>

    <div class="drawer-body mt-2">
      <!-- Shining Audit Panel -->
      <div v-if="activeDrawerTab === 'shining'" class="shining-audit-panel">
        <div class="flex justify-between align-center mb-4">
          <h5 aria-level="3" class="section-title mb-0">
            {{ $t('teacher.drawer.shiningAuditBtn') }}
          </h5>
          <button class="btn btn-primary btn-sm" @click="triggerPrint(student.username)">
            {{ $t('teacher.drawer.printBtn') }}
          </button>
        </div>

        <!-- Read Only Basic Info -->
        <div class="basic-info-readonly-card mb-4">
          <h6 aria-level="4">📋 {{ $t('teacher.studentList.studentInfo') }}</h6>
          <div class="readonly-grid mt-2">
            <div>
              <span>{{ $t('teacher.drawer.fieldName') }}：</span
              ><strong>{{
                getShining(student.username).name || $t('teacher.drawer.notFilled')
              }}</strong>
            </div>
            <div>
              <span>{{ $t('teacher.drawer.fieldBirthday') }}：</span
              ><strong>{{
                getShining(student.username).birthday || $t('teacher.drawer.notFilled')
              }}</strong>
            </div>
            <div>
              <span>{{ $t('teacher.drawer.fieldChurch') }}：</span
              ><strong>{{
                getShining(student.username).church || $t('teacher.drawer.notFilled')
              }}</strong>
            </div>
            <div>
              <span>{{ $t('teacher.drawer.fieldGrade') }}：</span
              ><strong>{{
                getShining(student.username).schoolGrade || $t('teacher.drawer.notFilled')
              }}</strong>
            </div>
          </div>
        </div>

        <!-- Read Only Checklist Statuses -->
        <div class="checklists-readonly-container mb-4">
          <h6 aria-level="4">🌟 {{ $t('teacher.studentList.faithChallenge') }}</h6>
          <div class="checklist-grid mt-2">
            <!-- Phase 1 -->
            <div class="checklist-ro-column">
              <div class="checklist-ro-title">{{ $t('teacher.studentList.faithPhase1') }}</div>
              <div class="checklist-ro-list">
                <div
                  v-for="(label, key) in phase1Labels"
                  :key="key"
                  :class="[
                    'ro-check-row',
                    { active: getShining(student.username).faithPhase1[key] }
                  ]"
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
                  <div
                    :class="[
                      'ro-check-row',
                      {
                        active: coursesStore.isShiningChecked(student.username, 'faithPhase2', key)
                      }
                    ]"
                  >
                    <span>{{
                      coursesStore.isShiningChecked(student.username, 'faithPhase2', key)
                        ? '✅'
                        : '❌'
                    }}</span>
                    <span v-if="key === 'courses30'" class="text-ro">
                      {{
                        $t('teacher.studentList.completedCourses', {
                          count: student.completedCount
                        })
                      }}
                    </span>
                    <span v-else class="text-ro">{{ label }}</span>
                  </div>
                </template>
              </div>
            </div>

            <!-- Challenges -->
            <div class="checklist-ro-column">
              <div class="checklist-ro-title">
                {{ $t('teacher.studentList.advancedChallenges') }}
              </div>
              <div class="checklist-ro-list">
                <div
                  v-for="(label, key) in advancedLabels"
                  :key="key"
                  :class="[
                    'ro-check-row',
                    { active: getShining(student.username).advancedChallenges[key] }
                  ]"
                >
                  <span>{{
                    getShining(student.username).advancedChallenges[key] ? '✅' : '❌'
                  }}</span>
                  <span v-if="key === 'custom'" class="text-ro">
                    {{ $t('teacher.studentList.customChallenge')
                    }}{{
                      getShining(student.username).customChallenge || $t('teacher.drawer.notFilled')
                    }}
                  </span>
                  <span v-else class="text-ro">{{ label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Editable Lecture Logs -->
        <div class="lectures-edit-section">
          <!-- Character Tables -->
          <div class="lecture-edit-group mb-4">
            <h6 aria-level="4">📖 {{ $t('teacher.studentList.characterThemes') }}</h6>
            <div class="lecture-inputs-stack mt-2">
              <div v-for="theme in characterThemes" :key="theme" class="lecture-edit-row">
                <div class="row-theme-name">✦ {{ theme }}</div>

                <!-- Editable row for teachers/admins/pastors -->
                <div v-if="authStore.currentUser?.role !== 'parent'" class="inputs-row">
                  <input
                    v-model="lectureForms[theme].speaker"
                    type="text"
                    class="form-input text-xs pt-1 pb-1"
                    :aria-label="$t('a11y.lecturerFor', { theme })"
                    :placeholder="$t('teacher.drawer.lecturerPlaceholder')"
                  />
                  <input
                    v-model="lectureForms[theme].date"
                    type="date"
                    class="form-input text-xs pt-1 pb-1"
                    :aria-label="$t('a11y.lectureDateFor', { theme })"
                  />
                  <button
                    class="btn btn-secondary btn-sm pt-1 pb-1"
                    @click="saveLectureRow(student.username, 'character', theme)"
                  >
                    {{ $t('teacher.drawer.saveLectureBtn') }}
                  </button>
                </div>

                <!-- Readonly row for parents -->
                <div v-else class="inputs-row-readonly text-sm">
                  <span v-if="lectureForms[theme]?.speaker" class="mr-4"
                    >{{ $t('teacher.drawer.lecturerLabel')
                    }}<strong>{{ lectureForms[theme].speaker }}</strong></span
                  >
                  <span v-if="lectureForms[theme]?.date"
                    >{{ $t('teacher.drawer.dateLabel')
                    }}<strong>{{ lectureForms[theme].date }}</strong></span
                  >
                  <span
                    v-if="!lectureForms[theme]?.speaker && !lectureForms[theme]?.date"
                    class="text-muted text-xs italic"
                    >{{ $t('teacher.drawer.notRegistered') }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- Coming of Age Tables -->
          <div class="lecture-edit-group mb-4">
            <h6 aria-level="4">🎓 {{ $t('teacher.studentList.comingOfAgeThemes') }}</h6>
            <div class="lecture-inputs-stack mt-2">
              <div v-for="theme in comingOfAgeThemes" :key="theme" class="lecture-edit-row">
                <div class="row-theme-name">✦ {{ theme }}</div>

                <!-- Editable row for teachers/admins/pastors -->
                <div v-if="authStore.currentUser?.role !== 'parent'" class="inputs-row">
                  <input
                    v-model="lectureForms[theme].speaker"
                    type="text"
                    class="form-input text-xs pt-1 pb-1"
                    :aria-label="$t('a11y.lecturerFor', { theme })"
                    :placeholder="$t('teacher.drawer.lecturerPlaceholder')"
                  />
                  <input
                    v-model="lectureForms[theme].date"
                    type="date"
                    class="form-input text-xs pt-1 pb-1"
                    :aria-label="$t('a11y.lectureDateFor', { theme })"
                  />
                  <button
                    class="btn btn-secondary btn-sm pt-1 pb-1"
                    @click="saveLectureRow(student.username, 'comingOfAge', theme)"
                  >
                    {{ $t('teacher.drawer.saveLectureBtn') }}
                  </button>
                </div>

                <!-- Readonly row for parents -->
                <div v-else class="inputs-row-readonly text-sm">
                  <span v-if="lectureForms[theme]?.speaker" class="mr-4"
                    >{{ $t('teacher.drawer.lecturerLabel')
                    }}<strong>{{ lectureForms[theme].speaker }}</strong></span
                  >
                  <span v-if="lectureForms[theme]?.date"
                    >{{ $t('teacher.drawer.dateLabel')
                    }}<strong>{{ lectureForms[theme].date }}</strong></span
                  >
                  <span
                    v-if="!lectureForms[theme]?.speaker && !lectureForms[theme]?.date"
                    class="text-muted text-xs italic"
                    >{{ $t('teacher.drawer.notRegistered') }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Bookings (read-only), e.g. for a parent following their child -->
      <div v-else-if="activeDrawerTab === 'bookings'" class="bookings-panel">
        <h5 aria-level="3" class="section-title mb-2">
          📅 {{ $t('teacher.drawer.bookings.title') }}
        </h5>
        <StudentBookingsSummary :username="student.username" />
      </div>
    </div>
  </section>

  <!-- Empty state when no student selected -->
  <section v-else class="student-details-drawer empty-drawer glass-panel text-center no-print">
    <div class="empty-illustration">👩‍🏫🎓</div>
    <h4 aria-level="2">{{ $t('teacher.drawer.emptyTitle') }}</h4>
    <p>{{ $t('teacher.drawer.emptyDesc') }}</p>
  </section>

  <!-- HIGH-FIDELITY PRINT LAYOUT (Hidden on screen) -->
  <StudentShiningPrint v-if="student" :username="student.username" />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
const { toast } = useToast()
const { t } = useI18n()
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { StudentProgressSummary } from './TeacherStudentList.vue'
import { useShiningProject } from '@/composables/useShiningProject'
import { avatarSrc } from '@/utils/avatar'
import StudentBookingsSummary from '@/components/shared/StudentBookingsSummary.vue'
import StudentShiningPrint from '@/components/student/StudentShiningPrint.vue'

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

const activeDrawerTab = ref<'notes' | 'shining' | 'bookings'>('shining')
const lectureForms = ref<Record<string, { speaker: string; date: string }>>({})

// ── Themes (of the student's church) and checklist labels ─────────────────────

const { characterThemes, comingOfAgeThemes, phase1Labels, phase2Labels, advancedLabels } =
  useShiningProject(() => props.student?.username)

// ── Watch Student Changes → Re-init forms ────────────────────────────────────

watch(
  () => props.student,
  (newStudent) => {
    if (newStudent) {
      activeDrawerTab.value = 'shining'
      initShiningForm(newStudent.username)
    }
  },
  { immediate: true }
)

// ── Helpers ───────────────────────────────────────────────────────────────────

function getShining(username: string) {
  return coursesStore.getShiningProject(username)
}

function initShiningForm(username: string) {
  const proj = coursesStore.getShiningProject(username)
  const form: Record<string, { speaker: string; date: string }> = {}
  const allThemes = [...characterThemes.value, ...comingOfAgeThemes.value]
  allThemes.forEach((theme) => {
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
</script>

<style scoped>
/* [css-migration] moved from TeacherDashboard.vue */
/* Drawer Tabs Selector Styles */
.drawer-tabs {
  display: flex;
  background: #f1f5f9;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  gap: 0.25rem;
}

.drawer-tab-btn {
  flex: 1;
  padding: 0.5rem;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 0.85rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.drawer-tab-btn.active {
  background: white;
  color: var(--secondary-hover);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1rem;
}

.student-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.drawer-body {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.empty-illustration {
  font-size: 4rem;
  margin-bottom: 1.5rem;
}

/* SHINING AUDIT VIEW STYLES */
.basic-info-readonly-card {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 1rem;
}

.readonly-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.checklist-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.checklist-ro-column {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.checklist-ro-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--secondary-hover);
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.25rem;
  margin-bottom: 0.5rem;
}

.checklist-ro-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.ro-check-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.lecture-inputs-stack {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.lecture-edit-row {
  background-color: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.85rem;
}

.row-theme-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.35rem;
}

.inputs-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.inputs-row-readonly {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  background: #f8fafc;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  border: 1px dashed #e2e8f0;
  color: var(--text-secondary);
}
</style>

<style>
/*
 * Intentionally global: used by several components, element selectors / keyframes,
 * or rules whose look depends on cascade order against main.css and other global
 * styles (scoping would raise their specificity and change what wins).
 *
 * Every selector is guarded by :where(body:has(.teacher-dashboard)) so these rules only apply
 * while that page is on screen; otherwise they would keep applying to other pages
 * after the user switches account in the same tab. :where() adds no specificity.
 */
/* Drawer Section */
:where(body:has(.teacher-dashboard)) .student-details-drawer {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  align-self: start;
  position: sticky;
  top: 96px;
}

:where(body:has(.teacher-dashboard)) .empty-drawer {
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

:where(body:has(.teacher-dashboard)) .empty-drawer h4 {
  font-size: 1.15rem;
  margin-bottom: 0.5rem;
}

:where(body:has(.teacher-dashboard)) .empty-drawer p {
  font-size: 0.85rem;
  color: var(--text-secondary);
  max-width: 280px;
}

:where(body:has(.teacher-dashboard)) .basic-info-readonly-card h6 {
  font-size: 0.9rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.25rem;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

:where(body:has(.teacher-dashboard)) .checklists-readonly-container h6 {
  font-size: 0.9rem;
  color: var(--text-primary);
}

:where(body:has(.teacher-dashboard)) .lectures-edit-section h6 {
  font-size: 0.9rem;
  color: var(--text-primary);
}

:where(body:has(.teacher-dashboard)) .inputs-row input {
  padding: 0.35rem 0.5rem;
  flex: 1;
}
</style>

<style scoped>
/* Moved from the parent view, which applied it globally */

.ro-check-row.active {
  color: var(--text-primary);
  font-weight: 600;
}

.ro-check-row .text-ro {
  line-height: 1.2;
}
</style>
