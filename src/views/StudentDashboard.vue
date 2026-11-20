<template>
  <div class="student-dashboard container">
    <!-- Header Summary Panel -->
    <header class="dashboard-header glass-panel no-print">
      <div class="user-greeting">
        <div
          class="avatar-clickable"
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
            alt="Avatar"
            class="avatar-lg"
            referrerpolicy="no-referrer"
            @error="useFallbackAvatar"
          />
          <span class="avatar-edit-hint">✏️</span>
          <div class="role-badge-overlay">{{ roleBadge }}</div>
        </div>
        <div>
          <h1 class="page-title">{{ $t('student.header.hello', { name: displayName }) }}</h1>
          <p class="motivation-text">{{ motivationText }}</p>
          <p v-if="authStore.currentUser?.lastLoginAt" class="last-login-hint">
            🕐
            {{
              $t('student.header.lastLogin', {
                time: tDateTime(authStore.currentUser?.lastLoginAt)
              })
            }}
          </p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span v-if="assignedTeacher" class="assigned-teacher-label"
              >🛡️ {{ $t('student.header.teacher') }}<strong>{{ assignedTeacher }}</strong></span
            >
            <span
              v-if="assignedPastor"
              class="assigned-teacher-label"
              style="background: rgba(139, 92, 246, 0.08); color: var(--info)"
              >⛪ {{ $t('student.header.pastor') }}<strong>{{ assignedPastor }}</strong></span
            >
            <span
              v-if="assignedParent"
              class="assigned-teacher-label"
              style="background: rgba(59, 130, 246, 0.08); color: var(--primary)"
              >👨‍👩‍👦 {{ $t('student.header.parent') }}<strong>{{ assignedParent }}</strong></span
            >
            <span
              v-if="!assignedTeacher && !assignedPastor && !assignedParent"
              class="no-teacher-hint"
              >{{ $t('student.header.noCaretaker') }}</span
            >
          </div>
        </div>
      </div>
      <div class="progress-summary">
        <div class="summary-card">
          <span class="summary-num">{{ completedCount }}/{{ coursesStore.courses.length }}</span>
          <span class="summary-label">{{ $t('student.header.completedCourses') }}</span>
        </div>
        <div class="summary-card">
          <span class="summary-num">{{ overallProgressPercent }}%</span>
          <span class="summary-label">{{ $t('student.header.overallProgress') }}</span>
        </div>
        <div
          class="summary-card clickable-card"
          :title="$t('common.editProfileHint')"
          role="button"
          tabindex="0"
          :aria-label="$t('common.editProfileHint')"
          @click="showProfileDialog = true"
          @keydown.enter.prevent="showProfileDialog = true"
          @keydown.space.prevent="showProfileDialog = true"
        >
          <span class="summary-num" style="font-size: 1.4rem">⚙️</span>
          <span class="summary-label">{{ $t('student.header.profileCard') }}</span>
        </div>
      </div>
    </header>

    <!-- Profile Dialog -->
    <ProfileDialog v-model="showProfileDialog" />

    <!-- Main Navigation Tab (Sermons vs Shining Project) -->
    <div class="main-tabs mb-4 no-print" role="tablist" :aria-label="$t('student.tabs.ariaLabel')">
      <button
        id="tab-sermons"
        role="tab"
        :aria-selected="activeDashboardTab === 'sermons'"
        aria-controls="tabpanel-sermons"
        :class="['main-tab-btn', { active: activeDashboardTab === 'sermons' }]"
        @click="activeDashboardTab = 'sermons'"
      >
        {{ $t('student.tabs.sermons') }}
        <template v-if="coursesWithNewReplies > 0">
          <span class="booking-badge" aria-hidden="true">{{ coursesWithNewReplies }}</span>
          <span class="sr-only">{{
            $t('student.course.coursesWithNewReplies', { n: coursesWithNewReplies })
          }}</span>
        </template>
      </button>
      <button
        id="tab-shining"
        role="tab"
        :aria-selected="activeDashboardTab === 'shining'"
        aria-controls="tabpanel-shining"
        :class="['main-tab-btn', { active: activeDashboardTab === 'shining' }]"
        @click="activeDashboardTab = 'shining'"
      >
        {{ $t('student.tabs.shining') }}
      </button>
      <button
        id="tab-my-bookings"
        role="tab"
        :aria-selected="activeDashboardTab === 'bookings'"
        aria-controls="tabpanel-bookings"
        :class="['main-tab-btn', { active: activeDashboardTab === 'bookings' }]"
        @click="activeDashboardTab = 'bookings'"
      >
        {{ $t('student.tabs.bookings') }}
        <span v-if="upcomingBookingsCount > 0" class="booking-badge">{{
          upcomingBookingsCount
        }}</span>
      </button>
    </div>

    <!-- TAB 1: Sermons Center -->
    <div
      v-if="activeDashboardTab === 'sermons'"
      id="tabpanel-sermons"
      role="tabpanel"
      aria-labelledby="tab-sermons"
      class="dashboard-body no-print"
    >
      <StudentCourseGrid
        :selected-course-id="selectedCourse?.id"
        @select-course="selectedCourse = $event"
      />
      <StudentCourseDetail :selected-course="selectedCourse" />
    </div>

    <!-- TAB 2: SS Shining Project Dashboard -->
    <!-- Wrapped: the component has two roots (its print layout is teleported), so it can't take these attributes -->
    <div
      v-else-if="activeDashboardTab === 'shining'"
      id="tabpanel-shining"
      role="tabpanel"
      aria-labelledby="tab-shining"
    >
      <StudentShiningDashboard />
    </div>

    <!-- TAB 3: 我的預約 -->
    <StudentBookingList
      v-if="activeDashboardTab === 'bookings'"
      id="tabpanel-bookings"
      role="tabpanel"
      aria-labelledby="tab-my-bookings"
      @open-feedback="openFeedbackModal"
    /><!-- end bookings tab -->

    <!-- ─── Modal: 學員填寫心得 ────────────────────────────────────── -->
    <StudentFeedbackModal
      v-model="showStudentFeedbackModal"
      :session="feedbackItem?.session ?? null"
      :initial-feedback="feedbackItem?.attendee.studentFeedback ?? ''"
      @submit="submitStudentFeedback"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useToast } from '@/composables/useToast'
const { toast } = useToast()
const { t } = useI18n()
const { tDateTime, tList } = useI18nHelper()
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Course } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingSession, BookingAttendee } from '@/stores/bookings'
import { defineAsyncComponent } from 'vue'
import type { FeedbackItem } from '@/components/student/StudentBookingList.vue'
import { avatarSrc, useFallbackAvatar } from '@/utils/avatar'

// --- 大型子元件：改用 defineAsyncComponent 按需載入，縮短首次渲染時間 ---
const ProfileDialog = defineAsyncComponent(() => import('@/components/shared/ProfileDialog.vue'))
const StudentFeedbackModal = defineAsyncComponent(
  () => import('@/components/student/StudentFeedbackModal.vue')
)
const StudentShiningDashboard = defineAsyncComponent(
  () => import('@/components/student/StudentShiningDashboard.vue')
)
const StudentBookingList = defineAsyncComponent(
  () => import('@/components/student/StudentBookingList.vue')
)
const StudentCourseGrid = defineAsyncComponent(
  () => import('@/components/student/StudentCourseGrid.vue')
)
const StudentCourseDetail = defineAsyncComponent(
  () => import('@/components/student/StudentCourseDetail.vue')
)

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const bookingsStore = useBookingsStore()

// ─── Student Booking (for tab badge only - detail handled in StudentBookingList) ────

/** Courses with caretakers' replies the student hasn't seen yet */
const coursesWithNewReplies = computed(() => {
  const me = authStore.currentUser
  return me ? coursesStore.coursesWithUnreadFeedback(me.username).length : 0
})

const upcomingBookingsCount = computed(() => {
  const me = authStore.currentUser
  if (!me) return 0
  return bookingsStore.getUpcomingSessions(me.username).length
})

// ── Student Feedback Modal (kept in parent to work with StudentBookingList event) ──

interface FeedbackItemLocal {
  session: BookingSession
  attendee: BookingAttendee
}

const showStudentFeedbackModal = ref(false)
const feedbackItem = ref<FeedbackItemLocal | null>(null)

function openFeedbackModal(item: FeedbackItem | FeedbackItemLocal) {
  feedbackItem.value = item as FeedbackItemLocal
  showStudentFeedbackModal.value = true
}

function submitStudentFeedback(feedback: string) {
  const item = feedbackItem.value
  if (!item) return
  bookingsStore.updateAttendee(item.session.id, item.attendee.studentUsername, {
    studentFeedback: feedback
  })
  toast(t('student.feedbackSaved'))
}

const activeDashboardTab = ref<'sermons' | 'shining' | 'bookings'>('sermons')
const selectedCourse = ref<Course | null>(null)
const showProfileDialog = ref(false)

// Display name: use nickname if set, else username
const displayName = computed(() => {
  const u = authStore.currentUser
  return u?.displayName || u?.username || ''
})

// Role badge emoji for avatar overlay
const badgeMap: Record<string, string> = {
  student: '🎒',
  teacher: '👨‍🏫',
  pastor: '⛪',
  parent: '👨‍👩‍👦',
  admin: '👑'
}
const roleBadge = computed(() => badgeMap[authStore.currentUser?.role || ''] || '👤')

// Motivational text based on progress percentage
const motivationText = computed(() => {
  const pct = overallProgressPercent.value
  if (pct === 0) return t('student.motivation.start')
  if (pct < 30) return t('student.motivation.low')
  if (pct < 60) return t('student.motivation.mid')
  if (pct < 100) return t('student.motivation.high')
  return t('student.motivation.done')
})

// Edit session state is now managed by StudentCourseDetail

// Caretakers by name (real name, else nickname, else username), as the student knows them
const nameOf = (username: string) => (username ? authStore.displayNameOf(username) : '')

const assignedTeacher = computed(() => {
  const username = authStore.currentUser?.username || ''
  return nameOf(coursesStore.getStudentCaretaker(username, 'teacher'))
})

const assignedPastor = computed(() => {
  const username = authStore.currentUser?.username || ''
  return nameOf(coursesStore.getStudentCaretaker(username, 'pastor'))
})

const assignedParent = computed(() => {
  const username = authStore.currentUser?.username || ''
  return tList(authStore.parentsOf(username).map(nameOf))
})

const completedCount = computed(() =>
  coursesStore.getCompletedCourseCount(authStore.currentUser?.username || '')
)

const overallProgressPercent = computed(() => {
  if (coursesStore.courses.length === 0) return 0
  return Math.round((completedCount.value / coursesStore.courses.length) * 100)
})

// ── Session inline edit handlers moved to StudentCourseDetail ──
</script>

<!-- Styles for this page only; and global ones that apply while it is shown (see the file) -->
<style scoped src="./styles/StudentDashboard.css"></style>
<style src="./styles/StudentDashboard.page.css"></style>
