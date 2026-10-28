<template>
  <div class="student-dashboard container">
    <!-- Header Summary Panel -->
    <header class="dashboard-header glass-panel no-print">
      <div class="user-greeting">
        <div
          class="avatar-clickable"
          :title="$t('common.editProfileHint')"
          @click="showProfileDialog = true"
        >
          <img :src="avatarSrc(authStore.currentUser?.avatarUrl)" alt="Avatar" class="avatar-lg" />
          <span class="avatar-edit-hint">✏️</span>
          <div class="role-badge-overlay">{{ roleBadge }}</div>
        </div>
        <div>
          <h2>{{ $t('student.header.hello', { name: displayName }) }}</h2>
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
          @click="showProfileDialog = true"
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
    <StudentShiningDashboard
      v-else-if="activeDashboardTab === 'shining'"
      id="tabpanel-shining"
      role="tabpanel"
      aria-labelledby="tab-shining"
    />

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
const { tDateTime } = useI18nHelper()
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Course } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingSession, BookingAttendee } from '@/stores/bookings'
import { defineAsyncComponent } from 'vue'
import type { FeedbackItem } from '@/components/student/StudentBookingList.vue'
import { avatarSrc } from '@/utils/avatar'

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

const completedCount = computed(() =>
  coursesStore.getCompletedCourseCount(authStore.currentUser?.username || '')
)

const overallProgressPercent = computed(() => {
  if (coursesStore.courses.length === 0) return 0
  return Math.round((completedCount.value / coursesStore.courses.length) * 100)
})

// ── Session inline edit handlers moved to StudentCourseDetail ──
</script>

<style scoped>
.user-greeting {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.avatar-lg {
  width: 72px;
  height: 72px;
  border-radius: var(--radius-full);
  background: white;
  border: 3px solid var(--primary);
  box-shadow: var(--shadow-sm);
}

.progress-summary {
  display: flex;
  gap: 1rem;
}

.summary-card {
  background: white;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-num {
  font-size: 1.8rem;
  font-weight: 700;
  color: var(--primary);
}

.summary-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.assigned-teacher-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--secondary-hover);
  background: rgba(16, 185, 129, 0.08);
  display: inline-block;
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius-full);
}

.no-teacher-hint {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 500;
}

/* Avatar clickable wrapper */
.avatar-clickable {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 50%;
}
.avatar-clickable:hover .avatar-edit-hint {
  opacity: 1;
}
.avatar-edit-hint {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  opacity: 0;
  transition: opacity 0.2s;
}
.role-badge-overlay {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: white;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

/* Motivational + last-login text */
.motivation-text {
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
}
.last-login-hint {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 2px;
}

/* Clickable summary card */
.clickable-card {
  cursor: pointer;
  transition:
    transform 0.15s,
    box-shadow 0.15s;
}
.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.15);
}

/* ══════════════════════════════════════════
   StudentDashboard — Mobile RWD (640px)
══════════════════════════════════════════ */
@media (max-width: 640px) {
  .user-greeting {
    gap: 0.75rem;
  }

  .avatar-lg {
    width: 52px;
    height: 52px;
  }

  .progress-summary {
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .summary-card {
    padding: 0.5rem 1rem;
    flex: 1;
    min-width: 70px;
  }

  .summary-num {
    font-size: 1.4rem;
  }
}

/* ══════════════════════════════════════════
   StudentDashboard — Mobile RWD (480px)
══════════════════════════════════════════ */
@media (max-width: 480px) {
  .user-greeting {
    width: 100%;
  }

  .progress-summary {
    width: 100%;
    justify-content: space-between;
  }

  .summary-card {
    padding: 0.4rem 0.6rem;
  }

  .summary-num {
    font-size: 1.2rem;
  }
}

/* ─── Student Booking Styles ─────────────────────────────────────────── */

.booking-badge {
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
/* Main Tab Switcher */
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

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

/* Main Layout Grid */
.dashboard-body {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 2rem;
}

@media (max-width: 900px) {
  .dashboard-body {
    grid-template-columns: 1fr;
  }
}

.filter-btn {
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

.filter-btn.active {
  background: var(--primary);
  color: white;
}

.save-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.save-status {
  font-size: 0.8rem;
  color: var(--secondary-hover);
  font-weight: 600;
}

.check-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

@keyframes float-pulse {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

/* HIGH FIDELITY PRINT MEDIA OVERRIDES */
.print-only {
  display: none;
}

/* ══════════════════════════════════════════
   StudentDashboard — Mobile RWD (640px)
══════════════════════════════════════════ */
@media (max-width: 640px) {
  /* Dashboard header compact */
  .dashboard-header {
    padding: 1rem;
    margin-bottom: 1rem;
    gap: 0.75rem;
  }

  /* Tab navigation: horizontal scroll instead of overflow */
  .main-tabs {
    overflow-x: auto;
    overflow-y: visible;
    -webkit-overflow-scrolling: touch;
    scroll-snap-type: x proximity;
    flex-wrap: nowrap;
    padding: 0.25rem;
    gap: 0.25rem;
    border-radius: var(--radius-sm);
  }

  .main-tab-btn {
    flex: 0 0 auto;
    padding: 0.6rem 0.85rem;
    font-size: 0.82rem;
    white-space: nowrap;
    scroll-snap-align: start;
  }

  /* Dashboard body: single column */
  .dashboard-body {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 0 0.25rem;
  }

  .filter-btn {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 0.78rem;
    padding: 0.35rem 0.75rem;
  }

  /* Panel header row */
  .panel-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .section-title {
    font-size: 1rem;
  }

  /* Glass panel padding */
  .glass-panel {
    padding: 1rem !important;
  }
}

/* ══════════════════════════════════════════
   StudentDashboard — Mobile RWD (480px)
══════════════════════════════════════════ */
@media (max-width: 480px) {
  .dashboard-header {
    padding: 0.75rem;
    flex-direction: column;
    align-items: flex-start;
  }

  .main-tab-btn {
    padding: 0.5rem 0.65rem;
    font-size: 0.78rem;
  }
}

@media print {
  /* Hide all screen elements completely */
  .no-print,
  nav,
  header,
  .main-tabs,
  .btn,
  .shining-toolbar,
  #app-container,
  .main-content {
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

/* ── Review slide transition ── */
.review-slide-enter-active,
.review-slide-leave-active {
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease;
  overflow: hidden;
  max-height: 600px;
}

.review-slide-enter-from,
.review-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* Compact form labels and inputs inside edit panel */
.form-label-sm {
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.2rem;
  display: block;
  color: var(--text-secondary);
}

.form-input-sm {
  font-size: 0.82rem;
  padding: 0.35rem 0.6rem;
  height: auto;
}

.btn-ghost {
  background: transparent;
  border: 1px solid var(--border, #e5e7eb);
  color: var(--text-secondary);
  cursor: pointer;
  font-weight: 500;
  transition: background 0.15s;
}

.btn-ghost:hover {
  background: rgba(0, 0, 0, 0.05);
}

.booking-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

/* Reuse booking status badge styles from TeacherDashboard (copy for scoped) */
.booking-status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.76rem;
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
  font-size: 0.73rem;
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
  font-size: 0.75rem;
  font-weight: 600;
  margin: 2px 3px 2px 0;
}
</style>
