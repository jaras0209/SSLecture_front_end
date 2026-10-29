<template>
  <div class="teacher-dashboard container">
    <!-- Header panel with statistics -->
    <header class="dashboard-header glass-panel no-print">
      <div class="header-intro">
        <div class="header-user-row">
          <div
            class="teacher-avatar-wrap"
            :title="$t('common.editProfileHint')"
            @click="showProfileDialog = true"
          >
            <img
              :src="avatarSrc(authStore.currentUser?.avatarUrl)"
              alt="avatar"
              class="teacher-avatar-sm"
            />
            <span class="teacher-role-badge">{{ teacherRoleBadge }}</span>
          </div>
          <div>
            <h2 v-if="authStore.currentUser?.role === 'pastor'">
              {{ $t('teacher.header.pastorTitle') }}
            </h2>
            <h2 v-else-if="authStore.currentUser?.role === 'admin'">
              {{ $t('teacher.header.adminTitle') }}
            </h2>
            <h2 v-else>{{ $t('teacher.header.teacherTitle') }}</h2>
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
 */
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
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
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
  gap: 2rem;
}

@media (max-width: 950px) {
  .dashboard-body {
    grid-template-columns: minmax(0, 1fr);
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
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.9rem;
}

.students-table td {
  padding: 1rem;
  border-bottom: 1px solid #e2e8f0;
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
  background: #f1f5f9;
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
  background: rgba(0, 0, 0, 0.05);
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
  background: #f1f5f9;
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
.text-xs {
  font-size: 0.75rem;
}

.mb-0 {
  margin-bottom: 0;
}

/* HIGH FIDELITY PRINT MEDIA OVERRIDES FOR TEACHER VIEW */
.print-only {
  display: none;
}

/* ═══════════════════════════════════════════════════════════════
   TeacherDashboard — Mobile RWD (640px)
═══════════════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  /* Dashboard header */
  .dashboard-header {
    padding: 1rem;
    margin-bottom: 1rem;
    gap: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
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
  }

  .main-tab-btn {
    white-space: nowrap;
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
    grid-template-columns: minmax(0, 1fr);
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
}

/* ═══════════════════════════════════════════════════════════════
   TeacherDashboard — Mobile RWD (480px)
═══════════════════════════════════════════════════════════════ */
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

  /* Student table: font smaller */
  .students-table th,
  .students-table td {
    font-size: 0.72rem;
    padding: 0.4rem 0.4rem;
  }

  /* Modal: full width on phones */
  .modal-card,
  .modal-booking-card {
    max-width: 100% !important;
    margin: 0;
    border-radius: var(--radius-md) var(--radius-md) 0 0;
  }

  .modal-overlay {
    padding: 0;
  }
}

@media print {
  /* Hide all screen elements completely */
  .no-print,
  nav,
  header,
  .main-tabs,
  .btn,
  .tab-selectors,
  #app-container,
  .main-content,
  .student-details-drawer {
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

  .print-w-45 {
    width: 45%;
  }
  .print-w-48 {
    width: 48%;
  }
  .print-w-50 {
    width: 50%;
  }

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

  .print-table th,
  .print-table td {
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
  background: #f8fafc;
  color: var(--primary);
}

.main-tab-btn.active {
  background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);
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
  border: 2px solid #e2e8f0;
  border-radius: 999px;
  background: white;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

.filter-btn:hover {
  border-color: #6366f1;
  color: #6366f1;
  background: #eef2ff;
}

.filter-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3);
}

.status-done {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
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
  color: #d97706;
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
  color: #6b7280;
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

.att-invited {
  background: rgba(107, 114, 128, 0.08);
  color: #6b7280;
  border: 1px solid rgba(107, 114, 128, 0.2);
}
.att-attended {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.att-absent {
  background: rgba(239, 68, 68, 0.08);
  color: #dc2626;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

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
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  background: transparent;
  cursor: pointer;
  transition: all 0.18s;
  color: var(--text-secondary);
}

.form-input-sm {
  font-size: 0.82rem;
}
</style>
