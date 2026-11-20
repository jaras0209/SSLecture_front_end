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
              referrerpolicy="no-referrer"
              @error="useFallbackAvatar"
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

    <!-- A teacher sees only students of their gender; without one set they see none -->
    <p v-if="teacherGenderUnset" class="gender-unset-banner no-print" role="status">
      ⚠️ {{ $t('gender.teacherUnsetNotice') }}
    </p>

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
      <!-- Lecture Tab: a teacher or pastor linked to a lecturer record -->
      <button
        v-if="isLecturer"
        id="tab-lectures"
        :class="['main-tab-btn', { active: activeMainTab === 'lectures' }]"
        @click="activeMainTab = 'lectures'"
      >
        🎤 {{ $t('teacher.tabs.lectures') }}
        <template v-if="awaitingAttendance.length > 0">
          <span class="tab-badge" aria-hidden="true">{{ awaitingAttendance.length }}</span>
          <span class="sr-only">{{
            $t('teacher.lecture.tabBadge', { n: awaitingAttendance.length })
          }}</span>
        </template>
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
        :church="currentContextChurch"
        @update:church="(c: string) => (adminSettingsChurch = c)"
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

    <!-- Tab: My Lectures -->
    <div v-if="activeMainTab === 'lectures' && isLecturer">
      <TeacherLectureSchedule />
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
const TeacherLectureSchedule = defineAsyncComponent(
  () => import('@/components/teacher/TeacherLectureSchedule.vue')
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
import { avatarSrc, useFallbackAvatar } from '@/utils/avatar'
import { canLecture, lecturerIdsOf } from '@/utils/scope'
import { useMyLectures } from '@/composables/useMyLectures'

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

// Main tab inside dashboard: 'care', 'settings', 'pastor-overview', 'bookings' or 'lectures'
const activeMainTab = ref<'care' | 'settings' | 'pastor-overview' | 'bookings' | 'lectures'>('care')

/** Lectures that are over with attendance left to record, for the tab badge */
const { awaitingAttendance } = useMyLectures()

/** A teacher or pastor account linked to a lecturer record gives lectures */
const isLecturer = computed(() => {
  const me = authStore.currentUser
  return (
    !!me && canLecture(me.role) && lecturerIdsOf(me.username, coursesStore.lecturers).length > 0
  )
})

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

// The church an admin manages in the Settings tab (its themes and lecturers); the lecturer
// dialog saves to the same church
const adminSettingsChurch = ref<string>(DEFAULT_CHURCH)
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
    if (role === 'teacher' || role === 'pastor') {
      coursesStore.assignStudentCaretaker(studentUsername, role, authStore.currentUser.username)
    }
  }
}

function unmanageStudent(studentUsername: string) {
  if (authStore.currentUser) {
    const role = authStore.currentUser.role
    if (role === 'teacher' || role === 'pastor') {
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

const teacherGenderUnset = computed(() => {
  const me = authStore.currentUser
  return me?.role === 'teacher' && !authStore.usersDb[me.username]?.gender
})

const myStudentsCount = computed(() => {
  const currentUserRole = authStore.currentUser?.role
  const currentUsername = authStore.currentUser?.username
  if (!currentUserRole || !currentUsername) return 0
  if (currentUserRole === 'admin') return studentsList.value.length
  if (!isCaretakerRole(currentUserRole)) return 0
  return studentsList.value.filter((s) =>
    coursesStore.isStudentCaredBy(s.username, currentUserRole, currentUsername)
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

<!-- Styles for this page only; and global ones that apply while it is shown (see the file) -->
<style scoped src="./styles/TeacherDashboard.css"></style>
<style src="./styles/TeacherDashboard.page.css"></style>
