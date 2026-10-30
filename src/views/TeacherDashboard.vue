<template>
  <div class="teacher-dashboard container">
    <!-- Header panel with statistics -->
    <header class="dashboard-header glass-panel no-print">
      <div class="header-intro">
        <div class="header-user-row">
          <div
            class="teacher-avatar-wrap"
            :title="$t('common.editProfileHint')"
            role="button"
            tabindex="0"
            :aria-label="$t('common.editProfileHint')"
            @click="showProfileDialog = true"
            @keydown.enter.prevent="showProfileDialog = true"
            @keydown.space.prevent="showProfileDialog = true"
          >
            <img
              :src="avatarSrc(authStore.currentUser?.avatarUrl)"
              alt="avatar"
              class="teacher-avatar-sm"
            />
            <span class="teacher-role-badge">{{ teacherRoleBadge }}</span>
          </div>
          <div>
            <h1 v-if="authStore.currentUser?.role === 'pastor'" class="page-title">
              {{ $t('teacher.header.pastorTitle') }}
            </h1>
            <h1 v-else-if="authStore.currentUser?.role === 'admin'" class="page-title">
              {{ $t('teacher.header.adminTitle') }}
            </h1>
            <h1 v-else class="page-title">{{ $t('teacher.header.teacherTitle') }}</h1>
            <p>{{ $t('teacher.header.welcome', { name: teacherDisplayName }) }}</p>
            <p v-if="authStore.currentUser?.lastLoginAt" class="last-login-hint-sm">
              🕐
              {{
                $t('teacher.header.lastLogin', {
                  time: tDateTime(authStore.currentUser?.lastLoginAt)
                })
              }}
            </p>
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
    <div v-if="authStore.currentUser?.role !== 'parent'" class="main-tabs mb-4 no-print">
      <button
        :class="['main-tab-btn', { active: activeMainTab === 'care' }]"
        @click="activeMainTab = 'care'"
      >
        <span v-if="authStore.currentUser?.role === 'pastor'"
          >⛪ {{ $t('teacher.tabs.carePastor') }}</span
        >
        <span v-else-if="authStore.currentUser?.role === 'admin'"
          >👑 {{ $t('teacher.tabs.careAdmin') }}</span
        >
        <span v-else>👨‍🏫 {{ $t('teacher.tabs.careTeacher') }}</span>
      </button>
      <!-- Pastor-only: Church Overview Tab -->
      <button
        v-if="authStore.currentUser?.role === 'pastor'"
        :class="['main-tab-btn', { active: activeMainTab === 'pastor-overview' }]"
        @click="activeMainTab = 'pastor-overview'"
      >
        ⛪ {{ $t('teacher.tabs.pastorOverview') }}
      </button>
      <button
        :class="['main-tab-btn', { active: activeMainTab === 'settings' }]"
        @click="activeMainTab = 'settings'"
      >
        ⚙️ {{ $t('teacher.tabs.settings') }}
      </button>
      <!-- Booking Tab: teacher + admin -->
      <button
        v-if="authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin'"
        id="tab-bookings"
        :class="['main-tab-btn', { active: activeMainTab === 'bookings' }]"
        @click="activeMainTab = 'bookings'"
      >
        📅 {{ $t('teacher.tabs.bookings') }}
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
      v-if="
        activeMainTab === 'bookings' &&
        (authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin')
      "
    >
      <TeacherBookingPanel />
    </div>

    <TeacherLecturerModal
      v-model="showLecturerModal"
      :lecturer="editingLecturer"
      :church="currentContextChurch"
    />

    <!-- Stats Report (Phase B component) -->
    <TeacherStatsReport
      v-if="
        activeMainTab === 'settings' &&
        (authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin')
      "
    />

    <!-- Notes Dialog (using extracted TeacherNotesDialog component) -->
    <TeacherNotesDialog
      v-model="showNotesDialog"
      :student="notesDialogStudent"
      :total-courses="coursesStore.courses.length"
      :can-send-feedback="authStore.currentUser?.role !== 'parent'"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useStudentList } from '@/composables/useStudentList'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { isCaretakerRole } from '@/types/courses'
import { useBookingsStore } from '@/stores/bookings'
import ProfileDialog from '@/components/shared/ProfileDialog.vue'
import TeacherLecturerModal from '@/components/teacher/TeacherLecturerModal.vue'
import { defineAsyncComponent } from 'vue'
import type { StudentProgressSummary } from '@/components/teacher/TeacherStudentList.vue'

// --- 大型子元件：改用 defineAsyncComponent 按需載入，縮減首次渲染負擔 ---
const TeacherNotesDialog = defineAsyncComponent(
  () => import('@/components/teacher/TeacherNotesDialog.vue')
)
const TeacherPastorOverview = defineAsyncComponent(
  () => import('@/components/teacher/TeacherPastorOverview.vue')
)
const TeacherSettingsPanel = defineAsyncComponent(
  () => import('@/components/teacher/TeacherSettingsPanel.vue')
)
const TeacherStatsReport = defineAsyncComponent(
  () => import('@/components/teacher/TeacherStatsReport.vue')
)
const TeacherBookingPanel = defineAsyncComponent(
  () => import('@/components/teacher/TeacherBookingPanel.vue')
)
const TeacherStudentList = defineAsyncComponent(
  () => import('@/components/teacher/TeacherStudentList.vue')
)
const TeacherStudentDrawer = defineAsyncComponent(
  () => import('@/components/teacher/TeacherStudentDrawer.vue')
)
import type { Lecturer } from '@/stores/courses'
import type { BookingSession } from '@/stores/bookings'
import { DEFAULT_CHURCH } from '@/types/auth'
import { avatarSrc } from '@/utils/avatar'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const bookingsStore = useBookingsStore()
const { tDateTime } = useI18nHelper()
const { studentsList } = useStudentList()

const showProfileDialog = ref(false)

const teacherDisplayName = computed(() => {
  const u = authStore.currentUser
  return u?.displayName || u?.username || ''
})

const teacherBadgeMap: Record<string, string> = {
  student: '🎒',
  teacher: '👨‍🏫',
  pastor: '⛪',
  parent: '👨‍👩‍👦',
  admin: '👑'
}
const teacherRoleBadge = computed(() => teacherBadgeMap[authStore.currentUser?.role || ''] || '👤')

const selectedStudent = ref<StudentProgressSummary | null>(null)

// Main tab inside dashboard: 'care', 'settings', 'pastor-overview', or 'bookings'
const activeMainTab = ref<'care' | 'settings' | 'pastor-overview' | 'bookings'>('care')

// Booking pending count for tab badge (computed directly from store to avoid component ref)
const bookingPendingCount = computed(() => {
  const me = authStore.currentUser
  if (!me) return 0
  return bookingsStore
    .getSessionsByTeacher(me.username)
    .filter((s: BookingSession) => s.status === 'pending').length
})

// Lecturer modal (form state lives in TeacherLecturerModal)
const showLecturerModal = ref(false)
const editingLecturer = ref<Lecturer | null>(null)

// Notes Dialog state
const showNotesDialog = ref(false)
const notesDialogStudent = ref<StudentProgressSummary | null>(null)

// Local lecturer form state for Settings tab

const adminSettingsChurch = ref(DEFAULT_CHURCH)
const currentContextChurch = computed(() => {
  return authStore.currentUser?.role === 'admin'
    ? adminSettingsChurch.value
    : authStore.currentUser?.church || DEFAULT_CHURCH
})

// Watch role changes - reset main tab when role changes
watch(
  () => authStore.currentUser?.role,
  (role) => {
    if (role === 'parent' || role === 'pastor' || role === 'admin') {
      activeMainTab.value = 'care'
    }
  },
  { immediate: true }
)

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
  editingLecturer.value = null
  showLecturerModal.value = true
}

function openEditLecturer(lec: Lecturer) {
  editingLecturer.value = lec
  showLecturerModal.value = true
}

// Generate the students progress summary list from databases

const myStudentsCount = computed(() => {
  const currentUserRole = authStore.currentUser?.role
  const currentUsername = authStore.currentUser?.username
  if (!currentUserRole || !currentUsername) return 0
  if (currentUserRole === 'admin') return studentsList.value.length
  if (!isCaretakerRole(currentUserRole)) return 0
  return studentsList.value.filter(
    (s) => coursesStore.getStudentCaretaker(s.username, currentUserRole) === currentUsername
  ).length
})

const totalNotesSubmitted = computed(() => {
  let count = 0
  studentsList.value.forEach((s) => {
    s.records.forEach((r) => {
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

// Note: getShining, isStudentManaged, getCaretakerStatusText, getCaretakerBadgeClass,
// initShiningForm, saveLectureRow, triggerPrint, phase labels, and theme computeds
// have been moved to TeacherStudentList.vue and TeacherStudentDrawer.vue
</script>

<style scoped>
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
  border: 2px solid rgba(99, 102, 241, 0.25);
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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

/* ── Booking Styles ─────────────────────────────────────────────────────────── */

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #ef4444;
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
:where(body:has(.teacher-dashboard)) .dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

:where(body:has(.teacher-dashboard)) .stat-box {
  background: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120px;
}

:where(body:has(.teacher-dashboard)) .stat-val {
  font-size: 2rem;
  font-weight: 700;
  color: var(--secondary);
}

:where(body:has(.teacher-dashboard)) .stat-lbl {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

/* Dashboard Columns */
:where(body:has(.teacher-dashboard)) .dashboard-body {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 2rem;
}

@media (max-width: 950px) {
  :where(body:has(.teacher-dashboard)) .dashboard-body {
    grid-template-columns: minmax(0, 1fr);
  }
}

:where(body:has(.teacher-dashboard)) .panel-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

:where(body:has(.teacher-dashboard)) .tab-btn {
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

:where(body:has(.teacher-dashboard)) .tab-btn.active {
  background: var(--secondary);
  color: white;
}

/* Table styling */
:where(body:has(.teacher-dashboard)) .table-container {
  overflow-x: auto;
}

:where(body:has(.teacher-dashboard)) .students-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

:where(body:has(.teacher-dashboard)) .students-table th {
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  font-weight: 700;
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.9rem;
}

:where(body:has(.teacher-dashboard)) .students-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
  font-size: 0.9rem;
}

:where(body:has(.teacher-dashboard)) .student-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

:where(body:has(.teacher-dashboard)) .avatar-sm {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  background: #f1f5f9;
  border: 2px solid var(--secondary);
}

:where(body:has(.teacher-dashboard)) .student-name {
  font-weight: 700;
  color: var(--text-primary);
}

/* Name + account ID layout in student table */
:where(body:has(.teacher-dashboard)) .student-name-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

:where(body:has(.teacher-dashboard)) .student-id-tag {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* Smaller inline tag for drawer / dialog headers */
:where(body:has(.teacher-dashboard)) .student-id-tag-sm {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
  background: rgba(0, 0, 0, 0.05);
  padding: 1px 6px;
  border-radius: 4px;
  margin-left: 6px;
  vertical-align: middle;
}

:where(body:has(.teacher-dashboard)) .empty-row {
  color: var(--text-muted);
  padding: 3rem;
}

:where(body:has(.teacher-dashboard)) .avatar-md {
  width: 50px;
  height: 50px;
  border-radius: var(--radius-full);
  background: #f1f5f9;
  border: 2px solid var(--secondary);
}

:where(body:has(.teacher-dashboard)) .close-btn {
  background: transparent;
  border: none;
  font-size: 1.8rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  padding: 0.25rem;
}

:where(body:has(.teacher-dashboard)) .close-btn:hover {
  color: var(--text-primary);
}

:where(body:has(.teacher-dashboard)) .section-title {
  font-size: 1rem;
  color: var(--text-primary);
  margin-bottom: 1rem;
  border-left: 4px solid var(--secondary);
  padding-left: 0.5rem;
  display: flex;
  align-items: center;
}
:where(body:has(.teacher-dashboard)) .text-xs {
  font-size: 0.75rem;
}

:where(body:has(.teacher-dashboard)) .mb-0 {
  margin-bottom: 0;
}

/* HIGH FIDELITY PRINT MEDIA OVERRIDES FOR TEACHER VIEW */
:where(body:has(.teacher-dashboard)) .print-only {
  display: none;
}

/* ═══════════════════════════════════════════════════════════════
   TeacherDashboard — Mobile RWD (640px)
═══════════════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  /* Dashboard header */
  :where(body:has(.teacher-dashboard)) .dashboard-header {
    padding: 1rem;
    margin-bottom: 1rem;
    gap: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
  }

  :where(body:has(.teacher-dashboard)) .stat-box {
    min-width: 80px;
    padding: 0.5rem 0.75rem;
    flex: 1;
  }

  :where(body:has(.teacher-dashboard)) .stat-val {
    font-size: 1.5rem;
  }

  /* Tab navigation: scrollable */
  :where(body:has(.teacher-dashboard)) .main-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    scroll-snap-type: x proximity;
  }

  :where(body:has(.teacher-dashboard)) .main-tab-btn {
    white-space: nowrap;
    scroll-snap-align: start;
  }

  :where(body:has(.teacher-dashboard)) .tab-btn {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 0.78rem;
    padding: 0.35rem 0.75rem;
  }

  /* Dashboard body */
  :where(body:has(.teacher-dashboard)) .dashboard-body {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }

  /* Glass panels */
  :where(body:has(.teacher-dashboard)) .glass-panel {
    padding: 1rem !important;
  }

  /* Panel header */
  :where(body:has(.teacher-dashboard)) .panel-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  /* Table: always has overflow-x auto */
  :where(body:has(.teacher-dashboard)) .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  :where(body:has(.teacher-dashboard)) .students-table th,
  :where(body:has(.teacher-dashboard)) .students-table td {
    font-size: 0.78rem;
    padding: 0.5rem 0.5rem;
    white-space: nowrap;
  }
}

/* ═══════════════════════════════════════════════════════════════
   TeacherDashboard — Mobile RWD (480px)
═══════════════════════════════════════════════════════════════ */
@media (max-width: 480px) {
  :where(body:has(.teacher-dashboard)) .dashboard-header {
    padding: 0.75rem;
  }

  :where(body:has(.teacher-dashboard)) .stat-box {
    min-width: 65px;
    padding: 0.4rem 0.5rem;
  }

  :where(body:has(.teacher-dashboard)) .stat-val {
    font-size: 1.3rem;
  }

  :where(body:has(.teacher-dashboard)) .stat-lbl {
    font-size: 0.72rem;
  }

  /* Student table: font smaller */
  :where(body:has(.teacher-dashboard)) .students-table th,
  :where(body:has(.teacher-dashboard)) .students-table td {
    font-size: 0.72rem;
    padding: 0.4rem 0.4rem;
  }

  /* Modal: full width on phones */
  :where(body:has(.teacher-dashboard)) .modal-card,
  :where(body:has(.teacher-dashboard)) .modal-booking-card {
    max-width: 100% !important;
    margin: 0;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  :where(body:has(.teacher-dashboard)) .modal-overlay {
    padding: 0;
  }
}

@media print {
  /* Hide all screen elements completely */
  :where(body:has(.teacher-dashboard)) .no-print,
  :where(body:has(.teacher-dashboard)) nav,
  :where(body:has(.teacher-dashboard)) header,
  :where(body:has(.teacher-dashboard)) .main-tabs,
  :where(body:has(.teacher-dashboard)) .btn,
  :where(body:has(.teacher-dashboard)) .tab-selectors,
  :where(body:has(.teacher-dashboard)) #app-container,
  :where(body:has(.teacher-dashboard)) .main-content,
  :where(body:has(.teacher-dashboard)) .student-details-drawer {
    display: none !important;
  }

  body:where(:has(.teacher-dashboard)) {
    background: white !important;
    color: black !important;
  }

  :where(body:has(.teacher-dashboard)) .print-only {
    display: block !important;
  }

  :where(body:has(.teacher-dashboard)) .print-page-layout {
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 20px;
    background-color: white;
  }

  :where(body:has(.teacher-dashboard)) .print-container {
    border: 3px double #000;
    border-radius: 12px;
    padding: 25px;
    background: white;
  }

  :where(body:has(.teacher-dashboard)) .print-banner {
    text-align: center;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 20px;
  }

  :where(body:has(.teacher-dashboard)) .print-banner-logo {
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: 2px;
  }

  :where(body:has(.teacher-dashboard)) .print-banner-sub {
    font-size: 1rem;
    font-weight: 700;
    letter-spacing: 3px;
    color: #444;
  }

  :where(body:has(.teacher-dashboard)) .print-flex-row {
    display: flex;
    justify-content: space-between;
    gap: 15px;
  }

  :where(body:has(.teacher-dashboard)) .print-w-45 {
    width: 45%;
  }
  :where(body:has(.teacher-dashboard)) .print-w-48 {
    width: 48%;
  }
  :where(body:has(.teacher-dashboard)) .print-w-50 {
    width: 50%;
  }

  :where(body:has(.teacher-dashboard)) .print-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
    background: #fff;
  }

  :where(body:has(.teacher-dashboard)) .print-box-title {
    font-size: 1rem;
    font-weight: 800;
    border-bottom: 1px solid #eee;
    padding-bottom: 5px;
    margin-bottom: 10px;
  }

  :where(body:has(.teacher-dashboard)) .print-box-subtitle {
    font-size: 0.75rem;
    color: #555;
    margin-bottom: 8px;
    font-style: italic;
  }

  :where(body:has(.teacher-dashboard)) .print-info-line {
    font-size: 0.9rem;
    margin-bottom: 8px;
    border-bottom: 1px dashed #ddd;
    padding-bottom: 2px;
  }

  :where(body:has(.teacher-dashboard)) .print-checklist {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  :where(body:has(.teacher-dashboard)) .print-check-line {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 0.85rem;
  }

  :where(body:has(.teacher-dashboard)) .print-check-circle {
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

  :where(body:has(.teacher-dashboard)) .print-check-circle.checked {
    background-color: #000;
    color: #fff;
  }

  :where(body:has(.teacher-dashboard)) .print-table-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
    background: #fff;
  }

  :where(body:has(.teacher-dashboard)) .print-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  :where(body:has(.teacher-dashboard)) .print-table th,
  :where(body:has(.teacher-dashboard)) .print-table td {
    border: 1px solid #000;
    padding: 6px 10px;
    font-size: 0.85rem;
    text-align: left;
  }

  :where(body:has(.teacher-dashboard)) .print-table th {
    background-color: #f2f2f2;
    font-weight: 700;
  }

  :where(body:has(.teacher-dashboard)) .print-signatures-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 15px;
  }

  :where(body:has(.teacher-dashboard)) .print-signatures-row {
    display: flex;
    justify-content: space-around;
  }

  :where(body:has(.teacher-dashboard)) .print-sig-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  :where(body:has(.teacher-dashboard)) .print-sig-lbl {
    font-size: 0.85rem;
    font-weight: 700;
  }

  :where(body:has(.teacher-dashboard)) .print-sig-space {
    width: 80px;
    height: 50px;
    border: 1.5px dashed #777;
    border-radius: 50%;
  }
}

/* Settings tab controls */
:where(body:has(.teacher-dashboard)) .main-tabs {
  display: flex;
  background: white;
  padding: 0.35rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  gap: 0.5rem;
}

:where(body:has(.teacher-dashboard)) .main-tab-btn {
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

:where(body:has(.teacher-dashboard)) .main-tab-btn:hover {
  background: #f8fafc;
  color: var(--primary);
}

:where(body:has(.teacher-dashboard)) .main-tab-btn.active {
  background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

:where(body:has(.teacher-dashboard)) .modal-overlay {
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

:where(body:has(.teacher-dashboard)) .modal-card {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
}

:where(body:has(.teacher-dashboard)) .check-item-row {
  font-size: 0.82rem;
  display: flex;
  align-items: flex-start;
  gap: 6px;
  cursor: pointer;
  padding: 2px 0;
}

:where(body:has(.teacher-dashboard)) .stats-field-item .form-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.35rem;
  font-size: 0.82rem;
}

:where(body:has(.teacher-dashboard)) .filter-btn {
  padding: 0.35rem 0.9rem;
  border: 2px solid #e2e8f0;
  border-radius: 999px;
  background: white;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

:where(body:has(.teacher-dashboard)) .filter-btn:hover {
  border-color: #6366f1;
  color: #4f46e5;
  background: #eef2ff;
}

:where(body:has(.teacher-dashboard)) .filter-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3);
}

:where(body:has(.teacher-dashboard)) .status-done {
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
}

/* Booking list */
:where(body:has(.teacher-dashboard)) .booking-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Status badges */
:where(body:has(.teacher-dashboard)) .booking-status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
}

:where(body:has(.teacher-dashboard)) .status-pending {
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

:where(body:has(.teacher-dashboard)) .status-confirmed {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.25);
}

:where(body:has(.teacher-dashboard)) .status-completed {
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

:where(body:has(.teacher-dashboard)) .status-cancelled {
  background: rgba(107, 114, 128, 0.1);
  color: #4b5563;
  border: 1px solid rgba(107, 114, 128, 0.25);
}

:where(body:has(.teacher-dashboard)) .booking-group-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.08);
  color: var(--primary);
}

:where(body:has(.teacher-dashboard)) .att-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 10px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

:where(body:has(.teacher-dashboard)) .att-invited {
  background: rgba(107, 114, 128, 0.08);
  color: #4b5563;
  border: 1px solid rgba(107, 114, 128, 0.2);
}
:where(body:has(.teacher-dashboard)) .att-attended {
  background: rgba(16, 185, 129, 0.1);
  color: #047857;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
:where(body:has(.teacher-dashboard)) .att-absent {
  background: rgba(239, 68, 68, 0.08);
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

:where(body:has(.teacher-dashboard)) .scripture-chip {
  display: inline-block;
  background: rgba(99, 102, 241, 0.08);
  color: var(--primary-hover);
  border-radius: 6px;
  padding: 1px 8px;
  font-size: 0.76rem;
  font-weight: 600;
  margin: 2px 3px 2px 0;
}

:where(body:has(.teacher-dashboard)) .att-username-hint {
  font-size: 0.72rem;
  color: var(--text-secondary);
}

:where(body:has(.teacher-dashboard)) .att-status-toggle {
  display: flex;
  gap: 0.35rem;
}

:where(body:has(.teacher-dashboard)) .att-toggle-btn {
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 20px;
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  background: transparent;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--text-secondary);
}

:where(body:has(.teacher-dashboard)) .form-input-sm {
  font-size: 0.82rem;
}
</style>
