<template>
  <div class="teacher-dashboard container">
    <!-- Header panel with statistics -->
    <header class="dashboard-header glass-panel no-print">
      <div class="header-intro">
        <div class="header-user-row">
          <div class="teacher-avatar-wrap" @click="showProfileDialog = true" :title="$t('common.editProfileHint')">
            <img :src="authStore.currentUser?.avatarUrl" alt="avatar" class="teacher-avatar-sm" />
            <span class="teacher-role-badge">{{ teacherRoleBadge }}</span>
          </div>
          <div>
            <h2 v-if="authStore.currentUser?.role === 'pastor'">{{ $t('teacher.header.pastorTitle') }}</h2>
            <h2 v-else-if="authStore.currentUser?.role === 'admin'">{{ $t('teacher.header.adminTitle') }}</h2>
            <h2 v-else>{{ $t('teacher.header.teacherTitle') }}</h2>
            <p>{{ $t('teacher.header.welcome', { name: teacherDisplayName }) }}</p>
            <p v-if="authStore.currentUser?.lastLoginAt" class="last-login-hint-sm">?? {{ $t('teacher.header.lastLogin', { time: authStore.currentUser?.lastLoginAt }) }}</p>
          </div>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-val">{{ studentsList.length }}</span>
          <span class="stat-lbl">{{ $t('teacher.header.totalStudents') }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ myStudentsCount }}</span>
          <span class="stat-lbl">{{ $t('teacher.header.myStudents') }}</span>
        </div>
        <div class="stat-box">
          <span class="stat-val">{{ totalNotesSubmitted }}</span>
          <span class="stat-lbl">{{ $t('teacher.header.notesSubmitted') }}</span>
        </div>
      </div>
    </header>

    <!-- Profile Dialog -->
    <ProfileDialog v-model="showProfileDialog" />

    <!-- Main Tab Switcher for settings tab -->
    <div class="main-tabs mb-4 no-print" v-if="authStore.currentUser?.role !== 'parent'">
      <button 
        :class="['main-tab-btn', { active: activeMainTab === 'care' }]"
        @click="activeMainTab = 'care'"
      >
        <span v-if="authStore.currentUser?.role === 'pastor'">?? {{ $t('teacher.tabs.carePastor') }}</span>
        <span v-else-if="authStore.currentUser?.role === 'admin'">?? {{ $t('teacher.tabs.careAdmin') }}</span>
        <span v-else>????{{ $t('teacher.tabs.careTeacher') }}</span>
      </button>
      <!-- Pastor-only: Church Overview Tab -->
      <button 
        v-if="authStore.currentUser?.role === 'pastor'"
        :class="['main-tab-btn', { active: activeMainTab === 'pastor-overview' }]"
        @click="activeMainTab = 'pastor-overview'"
      >
        ??{{ $t('teacher.tabs.pastorOverview') }}
      </button>
      <button 
        :class="['main-tab-btn', { active: activeMainTab === 'settings' }]"
        @click="activeMainTab = 'settings'"
      >
        ?? {{ $t('teacher.tabs.settings') }}
      </button>
      <!-- Booking Tab: teacher + admin -->
      <button
        v-if="authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin'"
        :class="['main-tab-btn', { active: activeMainTab === 'bookings' }]"
        @click="activeMainTab = 'bookings'"
        id="tab-bookings"
      >
        ?? {{ $t('teacher.tabs.bookings') }}
        <span v-if="bookingPendingCount > 0" class="tab-badge">{{ bookingPendingCount }}</span>
      </button>
    </div>

    <!-- Tab 1: Care & Progress Dashboard -->
    <div v-if="activeMainTab === 'care'" class="dashboard-body no-print">
      <TeacherStudentList
        @view-student="viewStudentDetails"
        @manage-student="manageStudent"
        @unmanage-student="unmanageStudent"
      />
      <TeacherStudentDrawer
        :student="selectedStudent"
        @close="selectedStudent = null"
        @open-notes="openNotesDialog"
      />
    </div>

    <!-- Tab: Pastor Church Overview -->
    <div v-if="activeMainTab === 'pastor-overview'">
      <TeacherPastorOverview />
    </div>

    <!-- Tab 2: Settings Console -->
    <div v-if="activeMainTab === 'settings' && authStore.currentUser?.role !== 'parent'">
      <TeacherSettingsPanel
        :is-admin="authStore.currentUser?.role === 'admin'"
        :current-context-church="currentContextChurch"
        @open-add-lecturer="openAddLecturer"
        @open-edit-lecturer="openEditLecturer"
      />
    </div>

    <!-- Tab: Bookings Management -->
    <div
      v-if="activeMainTab === 'bookings' && (authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin')"
    >
      <TeacherBookingPanel />
    </div>

    <Teleport to="body">
      <div v-if="showLecturerModal" class="modal-overlay" role="dialog" aria-modal="true" :aria-label="editingLecturerId ? $t('teacher.lecturer.editTitle') : $t('teacher.lecturer.addTitle')">
      <div class="glass-panel modal-card lecturer-modal-card">
        <h3>{{ editingLecturerId ? '?? ' + $t('teacher.lecturer.editTitle') : '??' + $t('teacher.lecturer.addTitle') }}</h3>

        <!-- Mode Toggle -->
        <div class="link-mode-toggle mt-4">
          <button
            class="link-mode-btn"
            :class="{ active: lecturerForm.linkMode === 'link' }"
            @click="lecturerForm.linkMode = 'link'; lecturerForm.linkedUsername = ''; lecturerForm.name = ''"
            id="btn-link-mode"
          >
            ?? {{ $t('teacher.lecturer.linkMode') }}
          </button>
          <button
            class="link-mode-btn"
            :class="{ active: lecturerForm.linkMode === 'custom' }"
            @click="lecturerForm.linkMode = 'custom'; lecturerForm.linkedUsername = ''"
            id="btn-custom-mode"
          >
            ?? {{ $t('teacher.lecturer.customMode') }}
          </button>
        </div>

        <!-- Link Mode: pick from teachers in church -->
        <div v-if="lecturerForm.linkMode === 'link'" class="form-group mt-4">
          <label class="form-label">{{ $t('teacher.lecturer.selectAccount') }}</label>
          <select
            v-model="lecturerForm.linkedUsername"
            class="form-input select-input"
            @change="onLinkedUsernameChange(lecturerForm.linkedUsername)"
            id="select-linked-teacher"
          >
            <option value="">{{ $t('teacher.lecturer.selectPlaceholder') }}</option>
            <option v-for="tc in teachersInChurch" :key="tc.username" :value="tc.username">
              {{ tc.displayLabel }}
            </option>
          </select>
          <p v-if="teachersInChurch.length === 0" class="text-xs text-muted mt-1">
            {{ $t('teacher.lecturer.noTeachersHint') }}
          </p>
          <div v-if="lecturerForm.linkedUsername" class="linked-user-preview mt-2">
            <span class="linked-chip">?? {{ $t('teacher.lecturer.linkedChip', { username: lecturerForm.linkedUsername }) }}</span>
            <span class="text-xs text-muted ml-2">{{ $t('teacher.lecturer.autoFillHint') }}</span>
          </div>
        </div>

        <!-- Lecturer display name (editable in custom mode, auto in link mode) -->
        <div class="form-group" :class="{ 'mt-4': lecturerForm.linkMode !== 'link' }">
          <label class="form-label">
            ? {{ $t('teacher.lecturer.displayName') }}
            <span v-if="lecturerForm.linkMode === 'link'" class="text-xs text-muted ml-1">{{ $t('teacher.lecturer.autoFillNote') }}</span>
          </label>
          <input
            v-model="lecturerForm.name"
            type="text"
            class="form-input"
            :placeholder="$t('teacher.lecturer.namePlaceholder')"
            id="input-lecturer-name"
          />
        </div>

        <div class="form-group">
          <label class="form-label">{{ $t('teacher.lecturer.titleLabel') }}</label>
          <select v-model="lecturerForm.title" class="form-input select-input" id="select-lecturer-title">
            <option value="講師">{{ $t('teacher.lecturer.titleOptions.lecturer') }}</option>
            <option value="牧師">{{ $t('teacher.lecturer.titleOptions.pastor') }}</option>
            <option value="傳道人">{{ $t('teacher.lecturer.titleOptions.preacher') }}</option>
            <option value="師母">{{ $t('teacher.lecturer.titleOptions.pastor_wife') }}</option>
            <option value="特約講師">{{ $t('teacher.lecturer.titleOptions.guest') }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">{{ $t('teacher.lecturer.courses') }} <span class="text-xs text-muted">{{ $t('teacher.lecturer.coursesHint') }}</span></label>
          <div class="courses-checkboxes-grid mt-2">
            <label v-for="c in coursesStore.courses" :key="c.id" class="check-item-row">
              <input type="checkbox" :value="c.id" v-model="lecturerForm.courseIds" />
              <span>{{ c.title }} <span class="text-xs text-muted">({{ c.category === 'bible' ? $t('teacher.lecturer.courseCategory.bible') : $t('teacher.lecturer.courseCategory.topic') }})</span></span>
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6" style="display: flex; justify-content: flex-end;">
          <button @click="showLecturerModal = false" class="btn btn-outline btn-sm">{{ $t('teacher.lecturer.cancelBtn') }}</button>
          <button @click="saveLecturer" class="btn btn-secondary btn-sm" id="btn-save-lecturer">{{ $t('teacher.lecturer.saveBtn') }}</button>
        </div>
      </div>
    </div>
    </Teleport>


    <!-- Stats Report (Phase B component) -->
    <TeacherStatsReport
      v-if="activeMainTab === 'settings' && (authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin')"
    />

  <!-- Notes Dialog (using extracted TeacherNotesDialog component) -->
  <TeacherNotesDialog
    v-model="showNotesDialog"
    :student="notesDialogStudent"
    :total-courses="coursesStore.courses.length"
    :can-send-feedback="authStore.currentUser?.role !== 'parent'"
    @feedback-sent="handleNotesDialogFeedback"
  />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useStudentList } from '@/composables/useStudentList'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import ProfileDialog from '@/components/ProfileDialog.vue'
import { defineAsyncComponent } from 'vue'
import type { StudentProgressSummary } from '@/components/teacher/TeacherStudentList.vue'

// --- 憭批?摮?隞塚??寧 defineAsyncComponent ??頛嚗葬?剝?甈⊥葡????---
const TeacherNotesDialog    = defineAsyncComponent(() => import('@/components/teacher/TeacherNotesDialog.vue'))
const TeacherPastorOverview = defineAsyncComponent(() => import('@/components/teacher/TeacherPastorOverview.vue'))
const TeacherSettingsPanel  = defineAsyncComponent(() => import('@/components/teacher/TeacherSettingsPanel.vue'))
const TeacherStatsReport    = defineAsyncComponent(() => import('@/components/teacher/TeacherStatsReport.vue'))
const TeacherBookingPanel   = defineAsyncComponent(() => import('@/components/teacher/TeacherBookingPanel.vue'))
const TeacherStudentList    = defineAsyncComponent(() => import('@/components/teacher/TeacherStudentList.vue'))
const TeacherStudentDrawer  = defineAsyncComponent(() => import('@/components/teacher/TeacherStudentDrawer.vue'))
import type { Lecturer } from '@/stores/courses'
import type { BookingSession } from '@/stores/bookings'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const bookingsStore = useBookingsStore()
const { toast } = useToast()
const { t } = useI18n()
const { studentsList } = useStudentList()

const showProfileDialog = ref(false)

const teacherDisplayName = computed(() => {
  const u = authStore.currentUser
  return u?.displayName || u?.username || ''
})

const teacherBadgeMap: Record<string, string> = {
  student: '🎒', teacher: '👨‍🏫', pastor: '⛪', parent: '👨‍👩‍👦', admin: '👑'
}
const teacherRoleBadge = computed(() => teacherBadgeMap[authStore.currentUser?.role || ''] || '👤')

const selectedStudent = ref<StudentProgressSummary | null>(null)

// Main tab inside dashboard: 'care', 'settings', 'pastor-overview', or 'bookings'
const activeMainTab = ref<'care' | 'settings' | 'pastor-overview' | 'bookings'>('care')

// Booking pending count for tab badge (computed directly from store to avoid component ref)
const bookingPendingCount = computed(() => {
  const me = authStore.currentUser
  if (!me) return 0
  return bookingsStore.getSessionsByTeacher(me.username).filter((s: BookingSession) => s.status === 'pending').length
})

// Lecturer Form Modal States
const showLecturerModal = ref(false)
const editingLecturerId = ref<string | null>(null)
const lecturerForm = ref({
  name: '',
  title: '牧師',
  courseIds: [] as string[],
  linkedUsername: '',   // '' = 未連結輔導教師帳號
  linkMode: 'custom' as 'link' | 'custom'  // 'link'=連結帳號, 'custom'=自訂
})

// Teachers available in current church for the link-account dropdown
const teachersInChurch = computed(() => {
  const church = currentContextChurch.value
  return Object.entries(authStore.usersDb)
    .filter(([, u]) => u.role === 'teacher' && u.church === church)
    .map(([username, u]) => ({
      username,
      displayLabel: u.realName
        ? `${u.realName}（${username}）`
        : u.displayName
          ? `${u.displayName}（${username}）`
          : `@${username}`,
      name: u.realName || u.displayName || username
    }))
})

// When linkedUsername changes in link-mode, auto-fill name from user db
function onLinkedUsernameChange(username: string) {
  if (!username) return
  const u = authStore.usersDb[username]
  if (u) {
    lecturerForm.value.name = u.realName || u.displayName || username
  }
}

// Notes Dialog state
const showNotesDialog = ref(false)
const notesDialogStudent = ref<StudentProgressSummary | null>(null)

// Local lecturer form state for Settings tab

const adminSettingsChurch = ref('??閰梯?')
const currentContextChurch = computed(() => {
  return authStore.currentUser?.role === 'admin'
    ? adminSettingsChurch.value
    : (authStore.currentUser?.church || '??閰梯?')
})

// feedbacksSent tracks the confirmation message displayed to teacher after sending feedback
const feedbacksSent = ref<Record<string, string>>({})


// Watch role changes - reset main tab when role changes
watch(() => authStore.currentUser?.role, (role) => {
  if (role === 'parent' || role === 'pastor' || role === 'admin') {
    activeMainTab.value = 'care'
  }
}, { immediate: true })

// Actions
function manageStudent(studentUsername: string) {
  if (authStore.currentUser) {
    const role = authStore.currentUser.role
    if (role === 'teacher' || role === 'pastor' || role === 'parent') {
      coursesStore.assignStudentCaretaker(studentUsername, role, authStore.currentUser.username)
    }
  }
}

function unmanageStudent(studentUsername: string) {
  if (authStore.currentUser) {
    const role = authStore.currentUser.role
    if (role === 'teacher' || role === 'pastor' || role === 'parent') {
      coursesStore.removeStudentCaretaker(studentUsername, role)
    }
  }
}


// Lecturer Actions


function openAddLecturer() {
  editingLecturerId.value = null
  lecturerForm.value = {
    name: '',
    title: '雓葦',
    courseIds: [],
    linkedUsername: '',
    linkMode: 'custom'
  }
  showLecturerModal.value = true
}

function openEditLecturer(lec: Lecturer) {
  editingLecturerId.value = lec.id
  lecturerForm.value = {
    name: lec.name,
    title: lec.title,
    courseIds: [...lec.courseIds],
    linkedUsername: lec.linkedUsername || '',
    linkMode: lec.linkedUsername ? 'link' : 'custom'
  }
  showLecturerModal.value = true
}

function saveLecturer() {
  if (!lecturerForm.value.name.trim()) {
    toast(t('teacher.lecturer.nameRequired'), 'warning')
    return
  }
  const linkedUsername = lecturerForm.value.linkMode === 'link'
    ? (lecturerForm.value.linkedUsername || '')
    : ''

  if (editingLecturerId.value) {
    coursesStore.updateLecturer(
      editingLecturerId.value,
      lecturerForm.value.name,
      lecturerForm.value.title,
      lecturerForm.value.courseIds,
      currentContextChurch.value,
      linkedUsername
    )
  } else {
    coursesStore.addLecturer(
      lecturerForm.value.name,
      lecturerForm.value.title,
      lecturerForm.value.courseIds,
      currentContextChurch.value,
      linkedUsername || undefined
    )
  }
  showLecturerModal.value = false
  toast(t('teacher.lecturer.savedToast'))
}

// Generate the students progress summary list from databases

const myStudentsCount = computed(() => {
  const currentUserRole = authStore.currentUser?.role
  const currentUsername = authStore.currentUser?.username
  if (!currentUserRole || !currentUsername) return 0
  if (currentUserRole === 'admin') return studentsList.value.length
  return studentsList.value.filter(s =>
    coursesStore.getStudentCaretaker(s.username, currentUserRole as any) === currentUsername
  ).length
})


const totalNotesSubmitted = computed(() => {
  let count = 0
  studentsList.value.forEach(s => {
    s.records.forEach(r => {
      if (r.notes && r.notes.trim() !== '') count++
    })
  })
  return count
})


function openNotesDialog(student: StudentProgressSummary) {
  notesDialogStudent.value = student
  showNotesDialog.value = true
}


function viewStudentDetails(student: StudentProgressSummary) {
  selectedStudent.value = student
}


function handleNotesDialogFeedback(username: string, courseId: string, msg: string) {
  const key = `${username}_${courseId}`
  feedbacksSent.value[key] = t('teacher.notes.feedbackSent', { username, msg })
  setTimeout(() => {
    delete feedbacksSent.value[key]
  }, 4000)
}


// Note: getShining, isStudentManaged, getCaretakerStatusText, getCaretakerBadgeClass,
// initShiningForm, saveLectureRow, triggerPrint, phase labels, and theme computeds
// have been moved to TeacherStudentList.vue and TeacherStudentDrawer.vue
</script>

<style>

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.header-user-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}
.teacher-avatar-wrap {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.teacher-avatar-sm {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(99,102,241,0.25);
  object-fit: cover;
  transition: opacity 0.2s;
}
.teacher-avatar-wrap:hover .teacher-avatar-sm {
  opacity: 0.8;
}
.teacher-role-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  background: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.last-login-hint-sm {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 2px;
}

.stats-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stat-box {
  background: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

.stat-val {
  font-size: 2rem;
  font-weight: 700;
  color: var(--secondary);
}

.stat-lbl {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Dashboard Columns */
.dashboard-body {
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 2rem;
}

@media (max-width: 950px) {
  .dashboard-body {
    grid-template-columns: 1fr;
  }
}

.panel-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.tab-btn {
  padding: 0.4rem 1rem;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-weight: 600;
  font-size: 0.85rem;
  border-radius: var(--radius-full);
  cursor: pointer;
  color: var(--text-secondary);
  transition: all var(--transition-fast);
}

.tab-btn.active {
  background: var(--secondary);
  color: white;
}

/* Table styling */
.table-container {
  overflow-x: auto;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.students-table th {
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  font-weight: 700;
  border-bottom: 2px solid #E2E8F0;
  font-size: 0.9rem;
}

.students-table td {
  padding: 1rem;
  border-bottom: 1px solid #E2E8F0;
  vertical-align: middle;
  font-size: 0.9rem;
}

.student-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar-sm {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  background: #F1F5F9;
  border: 2px solid var(--secondary);
}

.student-name {
  font-weight: 700;
  color: var(--text-primary);
}

/* Name + account ID layout in student table */
.student-name-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.student-id-tag {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Smaller inline tag for drawer / dialog headers */
.student-id-tag-sm {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
  background: rgba(0,0,0,0.05);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
}

.empty-row {
  color: var(--text-muted);
  padding: 3rem;
}

.avatar-md {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-full);
  background: #F1F5F9;
  border: 2px solid var(--secondary);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.8rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem;
}

.close-btn:hover {
  color: var(--text-primary);
}

.section-title {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
  border-left: 4px solid var(--secondary);
  padding-left: 0.5rem;
  display: flex;
  align-items: center;
}

.records-stack {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.record-detail-card {
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-md);
  padding: 1rem;
}

.record-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.record-title-row h6 {
  font-size: 0.95rem;
  color: var(--text-primary);
}

.record-meta {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-bottom: 0.25rem;
}

.record-timestamps {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
  border-bottom: 1px dashed #E2E8F0;
  padding-bottom: 0.5rem;
  margin-bottom: 0.5rem;
}

.text-highlight {
  color: var(--primary);
}

.record-notes {
  background: white;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.notes-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.notes-content {
  font-size: 0.85rem;
  color: var(--text-primary);
  white-space: pre-wrap;
}

/* Feedback Box */
.feedback-input-area {
  border-top: 1px dashed #E2E8F0;
  padding-top: 0.75rem;
}

.font-bold { font-weight: 700; }
.text-xs { font-size: 0.75rem; }

.feedback-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
}

.feedback-row input {
  padding: 0.4rem 0.75rem;
}

.feedback-status {
  color: var(--primary);
  font-size: 0.75rem;
  font-weight: 600;
}

.ro-check-row.active {
  color: var(--text-primary);
  font-weight: 600;
}

.ro-check-row .text-ro {
  line-height: 1.2;
}

.mb-0 {
  margin-bottom: 0;
}

/* HIGH FIDELITY PRINT MEDIA OVERRIDES FOR TEACHER VIEW */
.print-only {
  display: none;
}

/* ???????????????????????????????????????????????????????????????
   TeacherDashboard ??Mobile RWD (640px)
??????????????????????????????????????????????????????????????? */
@media (max-width: 640px) {
  /* Dashboard header */
  .dashboard-header {
    padding: 1rem;
    margin-bottom: 1rem;
    gap: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
  }

  .user-greeting {
    gap: 0.75rem;
    width: 100%;
  }

  .avatar-lg {
    width: 52px;
    height: 52px;
  }

  /* Stat boxes */
  .teacher-stats-row {
    gap: 0.5rem;
  }

  .stat-box {
    min-width: 80px;
    padding: 0.5rem 0.75rem;
    flex: 1;
  }

  .stat-val {
    font-size: 1.5rem;
  }

  /* Tab navigation: scrollable */
  .main-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    scroll-snap-type: x proximity;
    padding: 0.25rem;
    gap: 0.25rem;
  }

  .main-tab-btn {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 0.82rem;
    padding: 0.6rem 0.85rem;
    scroll-snap-align: start;
  }

  .tab-btn {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 0.78rem;
    padding: 0.35rem 0.75rem;
  }

  /* Dashboard body */
  .dashboard-body {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  /* Glass panels */
  .glass-panel {
    padding: 1rem !important;
  }

  /* Panel header */
  .panel-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  /* Table: always has overflow-x auto */
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .students-table th,
  .students-table td {
    font-size: 0.78rem;
    padding: 0.5rem 0.5rem;
    white-space: nowrap;
  }

  .booking-meta-row {
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  .booking-actions-row {
    flex-wrap: wrap;
    gap: 0.4rem;
  }
}

/* ???????????????????????????????????????????????????????????????
   TeacherDashboard ??Mobile RWD (480px)
??????????????????????????????????????????????????????????????? */
@media (max-width: 480px) {
  .dashboard-header {
    padding: 0.75rem;
  }

  .stat-box {
    min-width: 65px;
    padding: 0.4rem 0.5rem;
  }

  .stat-val {
    font-size: 1.3rem;
  }

  .stat-lbl {
    font-size: 0.72rem;
  }

  /* Main tab buttons smaller */
  .main-tab-btn {
    padding: 0.5rem 0.65rem;
    font-size: 0.78rem;
  }

  /* Student table: font smaller */
  .students-table th,
  .students-table td {
    font-size: 0.72rem;
    padding: 0.4rem 0.4rem;
  }

  .booking-filter-tab {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }

  /* Booking create button */
  .booking-create-btn {
    width: 100%;
    justify-content: center;
  }

  /* Modal: full width on phones */
  .modal-card,
  .modal-booking-card {
    max-width: 100% !important;
    margin: 0;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .modal-overlay {
    align-items: flex-end;
    padding: 0;
  }

  /* Student card (if card view) */
  .student-card-content {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media print {
  /* Hide all screen elements completely */
  .no-print, nav, header, .main-tabs, .btn, .tab-selectors, #app-container, .main-content, .student-details-drawer {
    display: none !important;
  }

  body {
    background: white !important;
    color: black !important;
  }

  .print-only {
    display: block !important;
  }

  .print-page-layout {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 20px;
    background-color: white;
  }

  .print-container {
    border: 3px double #000;
    border-radius: 12px;
    padding: 25px;
    background: white;
  }

  .print-banner {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }

  .print-banner-logo {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: 2px;
  }

  .print-banner-sub {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 3px;
    color: #444;
  }

  .print-flex-row {
    display: flex;
    justify-content: space-between;
    gap: 15px;
  }

  .print-w-45 { width: 45%; }
  .print-w-48 { width: 48%; }
  .print-w-50 { width: 50%; }

  .print-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
    background: #fff;
  }

  .print-box-title {
    font-size: 1rem;
    font-weight: 800;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }

  .print-box-subtitle {
    font-size: 0.75rem;
    color: #555;
    margin-bottom: 8px;
    font-style: italic;
  }

  .print-info-line {
    font-size: 0.9rem;
    margin-bottom: 8px;
    border-bottom: 1px dashed #ddd;
    padding-bottom: 2px;
  }

  .print-checklist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .print-check-line {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
  }

  .print-check-circle {
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

  .print-check-circle.checked {
    background-color: #000;
    color: #fff;
  }

  .print-table-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
    background: #fff;
  }

  .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  .print-table th, .print-table td {
    border: 1px solid #000;
    padding: 6px 10px;
    font-size: 0.85rem;
    text-align: left;
  }

  .print-table th {
    background-color: #f2f2f2;
    font-weight: 700;
  }

  .print-signatures-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
  }

  .print-signatures-row {
    display: flex;
    justify-content: space-around;
  }

  .print-sig-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .print-sig-lbl {
    font-size: 0.85rem;
    font-weight: 700;
  }

  .print-sig-space {
    width: 80px;
    height: 50px;
    border: 1.5px dashed #777;
    border-radius: 50%;
  }
}

/* Settings tab controls */
.main-tabs {
  display: flex;
  background: white;
  padding: 0.35rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  gap: 0.5rem;
}

.main-tab-btn {
  flex: 1;
  padding: 0.85rem;
  font-family: var(--font-family);
  font-weight: 700;
  font-size: 1rem;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-normal);
}

.main-tab-btn:hover {
  background: #F8FAFC;
  color: var(--primary);
}

.main-tab-btn.active {
  background: linear-gradient(135deg, var(--primary) 0%, #4F46E5 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

/* ?????? Lecturer Modal ?????? */
.lecturer-modal-card {
  max-width: 620px;
  width: 90%;
  max-height: 88vh;
  overflow-y: auto;
  padding: 2rem;
}

.link-mode-toggle {
  display: flex;
  gap: 0.5rem;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 0.35rem;
}

.link-mode-btn {
  flex: 1;
  padding: 0.55rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.link-mode-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 2px 8px rgba(99,102,241,0.3);
}

.linked-user-preview {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
}

.linked-chip {
  font-size: 0.78rem;
  font-weight: 700;
  color: #059669;
}

.courses-checkboxes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.8);
}

.check-item-row {
  font-size: 0.82rem;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
  padding: 2px 0;
}

.stats-field-item .form-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
}

.filter-btn {
  padding: 0.35rem 0.9rem;
  border: 2px solid #E2E8F0;
  border-radius: 999px;
  background: white;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748B;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

.filter-btn:hover {
  border-color: #6366F1;
  color: #6366F1;
  background: #EEF2FF;
}

.filter-btn.active {
  background: #6366F1;
  border-color: #6366F1;
  color: white;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3);
}

.status-done {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.status-pending {
  background: rgba(245, 158, 11, 0.1);
  color: #D97706;
}

/* ?????? Booking Styles ?????????????????????????????????????????????????????????????????????????????????????? */

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #EF4444;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  margin-left: 4px;
  vertical-align: middle;
}

.booking-filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

/* Booking list */
.booking-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Status badges */
.booking-status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
}

.status-pending {
  background: rgba(245, 158, 11, 0.12);
  color: #D97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-confirmed {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.25);
}

.status-completed {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.status-cancelled {
  background: rgba(107, 114, 128, 0.1);
  color: #6B7280;
  border: 1px solid rgba(107, 114, 128, 0.25);
}

.booking-group-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.08);
  color: var(--primary);
}

.att-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.att-invited  { background: rgba(107, 114, 128, 0.08); color: #6B7280; border: 1px solid rgba(107,114,128,0.2); }
.att-attended { background: rgba(16, 185, 129, 0.1); color: #059669; border: 1px solid rgba(16,185,129,0.25); }
.att-absent   { background: rgba(239, 68, 68, 0.08); color: #DC2626; border: 1px solid rgba(239,68,68,0.2); }

.scripture-chip {
  display: inline-block;
  background: rgba(99, 102, 241, 0.08);
  color: var(--primary);
  border-radius: 6px;
  padding: 1px 8px;
  font-size: 0.76rem;
  font-weight: 600;
  margin: 2px 3px 2px 0;
}

.att-username-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

.att-status-toggle {
  display: flex;
  gap: 0.35rem;
}

.att-toggle-btn {
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 20px;
  border: 1.5px solid rgba(99,102,241,0.2);
  background: transparent;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--text-secondary);
}

.att-toggle-btn.active {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
  border-color: rgba(16,185,129,0.4);
}

.att-toggle-btn.danger.active {
  background: rgba(239, 68, 68, 0.12);
  color: #DC2626;
  border-color: rgba(239,68,68,0.35);
}

.form-input-sm {
  font-size: 0.82rem;
}

</style>
