<template>
  <div class="student-dashboard container">
    <!-- Header Summary Panel -->
    <header class="dashboard-header glass-panel no-print">
      <div class="user-greeting">
        <div class="avatar-clickable" @click="showProfileDialog = true" title="點擊編輯個人資料">
          <img :src="authStore.currentUser?.avatarUrl" alt="Avatar" class="avatar-lg" />
          <span class="avatar-edit-hint">✏️</span>
          <div class="role-badge-overlay">{{ roleBadge }}</div>
        </div>
        <div>
          <h2>哈囉，{{ displayName }}！ 👋</h2>
          <p class="motivation-text">{{ motivationText }}</p>
          <p v-if="authStore.currentUser?.lastLoginAt" class="last-login-hint">
            🕐 上次登入：{{ authStore.currentUser?.lastLoginAt }}
          </p>
          <div class="flex flex-wrap gap-2 mt-2">
            <span v-if="assignedTeacher" class="assigned-teacher-label">🛡️ 輔導教師：<strong>{{ assignedTeacher }}</strong></span>
            <span v-if="assignedPastor" class="assigned-teacher-label" style="background: rgba(139, 92, 246, 0.08); color: var(--info);">⛪ 分區牧者：<strong>{{ assignedPastor }}</strong></span>
            <span v-if="assignedParent" class="assigned-teacher-label" style="background: rgba(59, 130, 246, 0.08); color: var(--primary);">👨‍👩‍👦 關懷家長：<strong>{{ assignedParent }}</strong></span>
            <span v-if="!assignedTeacher && !assignedPastor && !assignedParent" class="no-teacher-hint">💬 尚未分配輔導關懷人員</span>
          </div>
        </div>
      </div>
      <div class="progress-summary">
        <div class="summary-card">
          <span class="summary-num">{{ completedCount }}/{{ coursesStore.courses.length }}</span>
          <span class="summary-label">已完成聽課</span>
        </div>
        <div class="summary-card">
          <span class="summary-num">{{ overallProgressPercent }}%</span>
          <span class="summary-label">總體完成度</span>
        </div>
        <div class="summary-card clickable-card" @click="showProfileDialog = true" title="編輯個人資料">
          <span class="summary-num" style="font-size: 1.4rem;">⚙️</span>
          <span class="summary-label">個人資料</span>
        </div>
      </div>
    </header>

    <!-- Profile Dialog -->
    <ProfileDialog v-model="showProfileDialog" />

    <!-- Main Navigation Tab (Sermons vs Shining Project) -->
    <div class="main-tabs mb-4 no-print">
      <button 
        :class="['main-tab-btn', { active: activeDashboardTab === 'sermons' }]"
        @click="activeDashboardTab = 'sermons'"
      >
        🎧 聽課學習中心
      </button>
      <button 
        :class="['main-tab-btn', { active: activeDashboardTab === 'shining' }]"
        @click="activeDashboardTab = 'shining'"
      >
        ✨ SS 閃耀計畫 Dashboard
      </button>
      <button
        :class="['main-tab-btn', { active: activeDashboardTab === 'bookings' }]"
        @click="activeDashboardTab = 'bookings'"
        id="tab-my-bookings"
      >
        📅 我的預約
        <span v-if="upcomingBookingsCount > 0" class="booking-badge">{{ upcomingBookingsCount }}</span>
      </button>
    </div>

    <!-- TAB 1: Sermons Center -->
    <div v-if="activeDashboardTab === 'sermons'" class="dashboard-body no-print">
      <StudentCourseGrid
        :selected-course-id="selectedCourse?.id"
        @select-course="selectedCourse = $event"
      />
      <StudentCourseDetail :selected-course="selectedCourse" />
    </div>

    <!-- TAB 2: SS Shining Project Dashboard -->
    <StudentShiningDashboard v-else-if="activeDashboardTab === 'shining'" />



    <!-- TAB 3: 我的預約 -->
    <StudentBookingList
      v-if="activeDashboardTab === 'bookings'"
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
import { useToast } from '@/composables/useToast'
const { toast } = useToast()
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Course } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingSession, BookingAttendee } from '@/stores/bookings'
import { defineAsyncComponent } from 'vue'
import type { FeedbackItem } from '@/components/student/StudentBookingList.vue'

// --- 大型子元件：改用 defineAsyncComponent 按需載入，縮短首次渲染時間 ---
const ProfileDialog          = defineAsyncComponent(() => import('@/components/ProfileDialog.vue'))
const StudentFeedbackModal   = defineAsyncComponent(() => import('@/components/student/StudentFeedbackModal.vue'))
const StudentShiningDashboard = defineAsyncComponent(() => import('@/components/student/StudentShiningDashboard.vue'))
const StudentBookingList     = defineAsyncComponent(() => import('@/components/student/StudentBookingList.vue'))
const StudentCourseGrid      = defineAsyncComponent(() => import('@/components/student/StudentCourseGrid.vue'))
const StudentCourseDetail    = defineAsyncComponent(() => import('@/components/student/StudentCourseDetail.vue'))

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

interface FeedbackItemLocal { session: BookingSession; attendee: BookingAttendee }

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
  toast('✅ 心得已儲存！')
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
  student: '🎒', teacher: '👨‍🏫', pastor: '⛪', parent: '👨‍👩‍👦', admin: '👑'
}
const roleBadge = computed(() => badgeMap[authStore.currentUser?.role || ''] || '👤')

// Motivational text based on progress percentage
const motivationText = computed(() => {
  const pct = overallProgressPercent.value
  if (pct === 0) return '開始你的第一步吧！🌱'
  if (pct < 30) return '很好的開始，繼續加油！💪'
  if (pct < 60) return '已完成超過一半，你很厲害！🔥'
  if (pct < 100) return '快到終點了，再一把勁！⭐'
  return '恭喜你！完成全部課程！🎉'
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

const completedCount = computed(() => {
  const username = authStore.currentUser?.username || ''
  const userRecords = coursesStore.progressDb[username]
  if (!userRecords) return 0
  return Object.values(userRecords).filter(r => r.completed).length
})

const overallProgressPercent = computed(() => {
  if (coursesStore.courses.length === 0) return 0
  return Math.round((completedCount.value / coursesStore.courses.length) * 100)
})

// ── Session inline edit handlers moved to StudentCourseDetail ──


</script>

<style>
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
  background: #F8FAFC;
  color: var(--primary);
}

.main-tab-btn.active {
  background: linear-gradient(135deg, var(--primary) 0%, #4F46E5 100%);
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

.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 0.2rem;
  border-radius: var(--radius-full);
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

/* Course Grid and Cards */
.courses-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.course-card {
  display: flex;
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.course-card:hover {
  transform: translateY(-3px);
}

.card-cover {
  width: 160px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  backdrop-filter: blur(4px);
}

.completed-check {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  background: var(--secondary);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
}

.card-content {
  padding: 1.25rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.course-title {
  font-size: 1.15rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.course-speaker {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.course-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-progress {
  margin-top: auto;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

/* Sticky Player Section */
.player-section {
  position: relative;
}

.sticky-panel {
  position: sticky;
  top: 96px;
  max-height: calc(100vh - 130px);
  overflow-y: auto;
  padding: 2rem;
  border-radius: var(--radius-lg);
  background: white;
}

/* 針對小螢幕設計精緻滾動條，確保按鈕必定能被看見 */
.sticky-panel::-webkit-scrollbar {
  width: 6px;
}
.sticky-panel::-webkit-scrollbar-track {
  background: transparent;
}
.sticky-panel::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.12);
  border-radius: 3px;
}
.sticky-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.22);
}

.panel-header {
  font-size: 1.25rem;
  color: var(--text-primary);
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 0.5rem;
}

.text-area {
  resize: vertical;
  border-radius: var(--radius-md);
  margin-top: 0.5rem;
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

.empty-player-state {
  padding: 4rem 2rem;
}

.empty-emoji {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  animation: float-pulse 3s infinite ease-in-out;
}

.empty-player-state h4 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.empty-player-state .desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* SHINING PROJECT DASHBOARD STYLE */
.shining-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.shining-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.shining-row-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .shining-row-cols {
    grid-template-columns: 1fr;
  }
}

.shining-card-title {
  font-size: 1.2rem;
  border-bottom: 3px solid var(--warning);
  padding-bottom: 0.5rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Basic Info card */
.shining-card-basic {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
}

.form-group-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.85rem;
}

.info-dot {
  color: var(--warning);
  font-weight: 700;
}

.info-lbl {
  font-weight: 700;
  min-width: 90px;
  color: var(--text-secondary);
}

.form-input-clean {
  flex-grow: 1;
  border: none;
  border-bottom: 2px dashed #E2E8F0;
  padding: 0.35rem 0.5rem;
  font-family: var(--font-family);
  font-size: 0.95rem;
  color: var(--text-primary);
  background: transparent;
  outline: none;
  transition: border-color var(--transition-fast);
}

.form-input-clean:focus {
  border-bottom-color: var(--warning);
}

.save-alert-msg {
  font-size: 0.8rem;
  color: var(--secondary-hover);
  font-weight: 700;
  margin-left: 0.5rem;
}

.text-right {
  text-align: right;
}

/* Checklists styling */
.checklist-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.check-item-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
}

.check-box-wrapper {
  position: relative;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
}

.check-box-wrapper input {
  opacity: 0;
  width: 0;
  height: 0;
}

.styled-checkbox {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #F1F5F9;
  border: 2px solid #CBD5E1;
  border-radius: 50%; /* Circles matching images */
  transition: all var(--transition-fast);
}

.check-box-wrapper input:checked + .styled-checkbox {
  background-color: var(--warning);
  border-color: var(--warning);
}

.check-box-wrapper input:checked + .styled-checkbox:after {
  content: "✓";
  position: absolute;
  color: white;
  font-weight: 800;
  font-size: 0.75rem;
  left: 4px;
  top: -1px;
}

.disabled-check {
  background-color: #E2E8F0;
  border-color: #CBD5E1;
}

.check-box-wrapper input:checked + .disabled-check {
  background-color: var(--primary);
  border-color: var(--primary);
}

.check-label-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.special-progress-row {
  background-color: #EFF6FF;
  padding: 0.5rem 0.75rem;
  border-radius: var(--radius-sm);
  border-left: 4px solid var(--primary);
}

.check-label-text-progress {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.check-label-text-progress span {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
}

.check-label-text-progress .progress-sub {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--primary);
}

.custom-challenge-wrap {
  flex-grow: 1;
}

.form-input-clean-custom {
  width: 100%;
  border: none;
  border-bottom: 2px dashed #E2E8F0;
  padding: 0.25rem 0.5rem;
  font-family: var(--font-family);
  font-size: 0.9rem;
  color: var(--text-primary);
  outline: none;
  background: transparent;
}

.form-input-clean-custom:focus {
  border-bottom-color: var(--warning);
}

/* Tables styling */
.shining-row-cols-tables {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 900px) {
  .shining-row-cols-tables {
    grid-template-columns: 1fr;
  }
}

.table-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
}

.table-sub-lbl {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
  margin-top: 0.25rem;
}

.shining-lecture-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.shining-lecture-table th {
  background-color: #F8FAFC;
  padding: 0.6rem 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
  border-bottom: 2px solid #E2E8F0;
  font-size: 0.85rem;
}

.shining-lecture-table td {
  padding: 0.75rem 0.85rem;
  border-bottom: 1px solid #F1F5F9;
  font-size: 0.9rem;
}

.theme-title-cell {
  font-weight: 700;
  color: var(--text-primary);
}

.empty-input-cell {
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.8rem;
}

/* Signature section */
.signatures-card {
  background: white;
  padding: 1.5rem;
  border-radius: var(--radius-md);
  margin-bottom: 1rem;
}

.signature-box-preview-container {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
  flex-wrap: wrap;
}

.sig-box-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 100px;
}

.sig-title-p {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.sig-circle-p {
  width: 72px;
  height: 72px;
  border: 2px dashed var(--text-muted);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: var(--text-muted);
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
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
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
  transition: transform 0.15s, box-shadow 0.15s;
}
.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99,102,241,0.15);
}


.datetime-input {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

@keyframes float-pulse {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
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

  /* Course card: vertical on mobile */
  .course-card {
    flex-direction: column;
  }

  .card-cover {
    width: 100%;
    height: 140px;
  }

  .card-content {
    padding: 0.85rem;
  }

  .course-title {
    font-size: 1rem;
  }

  /* Filter tabs: horizontal scroll */
  .filter-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    max-width: 100%;
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

  .main-tab-btn {
    padding: 0.5rem 0.65rem;
    font-size: 0.78rem;
  }

  /* Booking panel styles */
  .student-bookings-panel {
    padding: 0.75rem !important;
  }

  .sbc-card {
    padding: 0.75rem;
  }

  .sbc-meta-row {
    flex-direction: column;
    gap: 0.25rem;
    align-items: flex-start;
  }

  .sbc-status-badge {
    align-self: flex-start;
  }

  .sbc-prep-row {
    font-size: 0.8rem;
  }

  .scripture-chip {
    font-size: 0.72rem;
    padding: 0.15rem 0.45rem;
  }

  /* Shining panel */
  .shining-dashboard-body {
    padding: 0.5rem;
  }

  .shining-row-cols {
    grid-template-columns: 1fr !important;
  }

  /* Form inline */
  .form-group-inline {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .info-lbl {
    min-width: unset;
    font-size: 0.8rem;
  }

  /* Print certificate button section */
  .print-cert-actions {
    flex-direction: column;
    gap: 0.5rem;
  }
}

@media print {
  /* Hide all screen elements completely */
  .no-print, nav, header, .main-tabs, .btn, .shining-toolbar, #app-container, .main-content {
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

/* ── Card selected state ── */
.course-card.card-selected {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* ── Section subtitle ── */
.section-sub-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
}

/* ── Small glass panel (used in timeline items) ── */
.glass-panel-sm {
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: var(--radius-sm, 8px);
  padding: 0.75rem 1rem;
  backdrop-filter: blur(6px);
}

/* ── Timeline ── */
.session-history .timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-left: 1.25rem;
  border-left: 2px solid rgba(99, 102, 241, 0.2);
}

.timeline-item {
  position: relative;
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.timeline-dot {
  position: absolute;
  left: -1.45rem;
  top: 0.5rem;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid white;
  flex-shrink: 0;
}

.timeline-dot.dot-latest {
  background: var(--primary, #6366f1);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.25);
}

.timeline-dot.dot-past {
  background: var(--text-muted, #9ca3af);
}

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.3rem;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.timeline-count {
  font-size: 0.8rem;
  font-weight: 700;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary, #6366f1);
  padding: 1px 8px;
  border-radius: 20px;
}

.timeline-date {
  font-size: 0.75rem;
  color: var(--text-muted, #9ca3af);
}

.timeline-lecturer {
  font-size: 0.85rem;
  font-weight: 600;
  margin: 0.2rem 0;
  color: var(--text-primary);
}

.timeline-notes {
  font-size: 0.82rem;
  color: var(--text-secondary);
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.5;
}

/* ── Review toggle button ── */
.btn-review-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.7rem 1rem;
  background: rgba(99, 102, 241, 0.08);
  border: 1.5px dashed rgba(99, 102, 241, 0.4);
  border-radius: var(--radius-sm, 8px);
  color: var(--primary, #6366f1);
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  text-align: left;
}

.btn-review-toggle:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: var(--primary, #6366f1);
}

/* ── Review slide transition ── */
.review-slide-enter-active,
.review-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
  max-height: 600px;
}

.review-slide-enter-from,
.review-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

.review-form {
  background: rgba(99, 102, 241, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: var(--radius-sm, 8px);
  padding: 1rem;
}

/* \u2500\u2500 Timeline edit controls \u2500\u2500 */
.timeline-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.btn-edit-session {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  padding: 2px 4px;
  border-radius: 4px;
  opacity: 0.5;
  transition: opacity 0.15s, background 0.15s;
  line-height: 1;
}

.btn-edit-session:hover {
  opacity: 1;
  background: rgba(99, 102, 241, 0.12);
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

.edit-session-form {
  border-top: 1px dashed rgba(99, 102, 241, 0.2);
  padding-top: 0.75rem;
}

.edit-session-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

/* Extra small button variant */
.btn-xs {
  font-size: 0.78rem;
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
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

/* ─── Student Booking Styles ─────────────────────────────────────────── */

.booking-badge {
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

.student-bookings-panel {
  padding: 1.5rem;
}

.booking-section {
  margin-bottom: 1rem;
}

.booking-section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.75rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgba(99,102,241,0.1);
}

.booking-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.student-booking-card {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: white;
  border: 1px solid rgba(99,102,241,0.1);
  transition: box-shadow 0.2s;
}

.student-booking-card:hover {
  box-shadow: 0 4px 16px rgba(99,102,241,0.1);
}

.student-booking-card.card-completed {
  border-color: rgba(16,185,129,0.2);
}

.sbc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.sbc-status-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.sbc-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1.4rem;
}

.sbc-info-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
}

.sbc-label {
  color: var(--text-secondary);
  font-size: 0.76rem;
}

.sbc-value {
  font-weight: 600;
  color: var(--text-primary);
}

/* Prep box */
.sbc-prep {
  background: rgba(99,102,241,0.04);
  border: 1px dashed rgba(99,102,241,0.18);
  border-radius: 8px;
  padding: 0.6rem 0.85rem;
}

.sbc-prep-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
  margin-bottom: 0.4rem;
}

.sbc-prep-row {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 0.2rem;
}

/* Feedback boxes */
.sbc-teacher-feedback {
  font-size: 0.8rem;
  color: #2563EB;
  background: rgba(37, 99, 235, 0.05);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  border-left: 3px solid rgba(37,99,235,0.3);
}

.sbc-my-feedback {
  font-size: 0.8rem;
  color: #059669;
  background: rgba(16,185,129,0.05);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
  border-left: 3px solid rgba(16,185,129,0.3);
}

.empty-booking-hint {
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: 2rem 0;
  font-style: italic;
}

/* Reuse booking status badge styles from TeacherDashboard (copy for scoped) */
.booking-status-badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.76rem;
  font-weight: 700;
}
.status-pending  { background: rgba(245,158,11,0.12); color: #D97706; border: 1px solid rgba(245,158,11,0.3); }
.status-confirmed{ background: rgba(99,102,241,0.1);  color: var(--primary); border: 1px solid rgba(99,102,241,0.25); }
.status-completed{ background: rgba(16,185,129,0.1);  color: #059669; border: 1px solid rgba(16,185,129,0.25); }
.status-cancelled{ background: rgba(107,114,128,0.1); color: #6B7280; border: 1px solid rgba(107,114,128,0.25); }

.booking-group-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 20px;
  background: rgba(99,102,241,0.08);
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
.att-invited  { background: rgba(107,114,128,0.08); color: #6B7280; border: 1px solid rgba(107,114,128,0.2); }
.att-attended { background: rgba(16,185,129,0.1);  color: #059669; border: 1px solid rgba(16,185,129,0.25); }
.att-absent   { background: rgba(239,68,68,0.08);  color: #DC2626; border: 1px solid rgba(239,68,68,0.2); }

.scripture-chip {
  display: inline-block;
  background: rgba(99,102,241,0.08);
  color: var(--primary);
  border-radius: 6px;
  padding: 1px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  margin: 2px 3px 2px 0;
}
</style>



