<template>
  <div class="dashboard-body no-print">
    <section class="glass-panel bookings-panel">
      <div class="panel-header-row">
        <h3 aria-level="2" class="section-title">{{ $t('teacher.booking.title') }}</h3>
        <button id="btn-create-booking" class="btn btn-primary" @click="openCreateBooking">
          {{ $t('teacher.booking.createBtn') }}
        </button>
      </div>

      <!-- Status Filter Tabs -->
      <div class="booking-filter-tabs mt-3">
        <button
          v-for="f in bookingFilters"
          :key="f.value"
          :class="['booking-filter-btn', { active: bookingFilter === f.value }]"
          @click="bookingFilter = f.value as typeof bookingFilter"
        >
          {{ f.label }}
          <span v-if="f.count > 0" class="filter-count">{{ f.count }}</span>
        </button>
      </div>

      <!-- Session List -->
      <div class="booking-list mt-4">
        <div
          v-for="session in filteredBookingSessions"
          :key="session.id"
          class="booking-card glass-card"
        >
          <div class="booking-card-header">
            <div class="booking-card-title">
              <span :class="['booking-status-badge', `status-${session.status}`]">
                {{ bookingStatusLabel(session.status) }}
              </span>
              <span v-if="session.isGroupSession" class="booking-group-badge">{{
                $t('teacher.booking.groupSession')
              }}</span>
            </div>
            <div class="booking-card-actions">
              <button
                v-if="session.status === 'pending'"
                class="btn btn-sm btn-outline"
                @click="openConfirmBooking(session)"
              >
                {{ $t('teacher.booking.confirmTime') }}
              </button>
              <button
                v-if="session.status === 'confirmed'"
                class="btn btn-sm btn-primary"
                @click="openCompleteBooking(session)"
              >
                {{ $t('teacher.booking.markComplete') }}
              </button>
              <button
                v-if="session.status === 'pending' || session.status === 'confirmed'"
                class="btn btn-sm btn-danger"
                @click="cancelBooking(session)"
              >
                {{ $t('teacher.booking.cancelBtn') }}
              </button>
            </div>
          </div>

          <div class="booking-info-row mt-2">
            <div class="booking-info-item">
              <span class="info-label">{{ $t('teacher.booking.course') }}</span>
              <span class="info-value">{{ session.courseTitle }}</span>
            </div>
            <div class="booking-info-item">
              <span class="info-label">{{ $t('teacher.booking.lecturer') }}</span>
              <span class="info-value"
                >{{ tLecturerTitle(session.lecturerTitle) }} {{ session.lecturerName }}</span
              >
            </div>
            <div class="booking-info-item">
              <span class="info-label">{{ $t('teacher.booking.time') }}</span>
              <span class="info-value">{{ tBookingTime(session) }}</span>
            </div>
            <div v-if="session.durationMinutes" class="booking-info-item">
              <span class="info-label">{{ $t('teacher.booking.duration') }}</span>
              <span class="info-value">{{
                $t('teacher.booking.minutes', { n: session.durationMinutes })
              }}</span>
            </div>
          </div>

          <div class="booking-attendees mt-2">
            <span class="info-label">{{ $t('teacher.booking.attendees') }}</span>
            <span
              v-for="att in attendeesOf(session.id).shown"
              :key="att.id"
              :class="['att-chip', `att-${att.attendanceStatus}`]"
            >
              {{ authStore.displayNameOf(att.studentUsername) }}
              <span :title="attendanceLabel(att.attendanceStatus)">{{
                attendanceIcon(att.attendanceStatus)
              }}</span>
            </span>
            <span v-if="attendeesOf(session.id).hidden > 0" class="hidden-attendees-note">
              {{ $t('gender.hiddenAttendees', { n: attendeesOf(session.id).hidden }) }}
            </span>
          </div>

          <div
            v-if="
              session.prep.scriptures.length || session.prep.readingNotes || session.prep.materials
            "
            class="booking-prep mt-2"
          >
            <div
              class="prep-header"
              style="cursor: pointer; display: flex; align-items: center; gap: 0.5rem"
              role="button"
              tabindex="0"
              :aria-expanded="expandedPreps.has(session.id)"
              @click="togglePrepExpand(session.id)"
              @keydown.enter.prevent="togglePrepExpand(session.id)"
              @keydown.space.prevent="togglePrepExpand(session.id)"
            >
              <span class="prep-toggle-label">{{ $t('teacher.booking.prepTitle') }}</span>
              <span>{{ expandedPreps.has(session.id) ? '▲' : '▼' }}</span>
            </div>
            <div v-if="expandedPreps.has(session.id)" class="prep-body mt-1">
              <div v-if="session.prep.scriptures.length" class="prep-section">
                <strong>{{ $t('teacher.booking.prepScriptures') }}</strong>
                <span v-for="(s, i) in session.prep.scriptures" :key="i" class="scripture-chip">{{
                  s
                }}</span>
              </div>
              <div v-if="session.prep.readingNotes" class="prep-section mt-1">
                <strong>{{ $t('teacher.booking.prepNotes') }}</strong
                >{{ session.prep.readingNotes }}
              </div>
              <div v-if="session.prep.materials" class="prep-section mt-1">
                <strong>{{ $t('teacher.booking.prepMaterials') }}</strong
                >{{ session.prep.materials }}
              </div>
            </div>
          </div>

          <div
            v-if="session.status === 'completed' && session.teacherSessionNotes"
            class="booking-completed-notes mt-2"
          >
            <strong>{{ $t('teacher.booking.sessionNotes') }}</strong
            >{{ session.teacherSessionNotes }}
          </div>
          <div
            v-if="session.status === 'cancelled' && session.cancelReason"
            class="booking-cancel-reason mt-2"
          >
            <strong>{{ $t('teacher.booking.cancelReason') }}</strong
            >{{ session.cancelReason }}
          </div>
        </div>

        <div v-if="filteredBookingSessions.length === 0" class="text-center text-muted py-8 italic">
          {{
            bookingFilter === 'all'
              ? $t('teacher.booking.emptyAll')
              : $t('teacher.booking.emptyFiltered')
          }}
        </div>
      </div>
    </section>

    <TeacherBookingCreateModal v-model="showCreateBookingModal" />

    <!-- ─── Modal: Confirm Time ─── -->
    <Teleport to="body">
      <div
        v-if="showConfirmBookingModal"
        class="modal-overlay"
        @click.self="showConfirmBookingModal = false"
      >
        <div
          v-dialog="() => (showConfirmBookingModal = false)"
          class="glass-panel modal-card"
          style="max-width: 420px; width: 90%; padding: 1.5rem"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-confirm-title"
        >
          <h3 id="booking-confirm-title" aria-level="2">
            {{ $t('teacher.booking.confirmModalTitle') }}
          </h3>
          <p class="text-muted mt-2 text-sm">{{ $t('teacher.booking.confirmModalDesc') }}</p>
          <div class="form-group mt-3">
            <label for="confirm-time-input" class="form-label">{{
              $t('teacher.booking.confirmTimeLabel')
            }}</label>
            <input
              id="confirm-time-input"
              v-model="confirmForm.confirmedAt"
              type="datetime-local"
              class="form-input"
            />
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showConfirmBookingModal = false">
              {{ $t('common.cancel') }}
            </button>
            <button id="btn-submit-confirm" class="btn btn-primary" @click="submitConfirmBooking">
              {{ $t('teacher.booking.confirmSubmit') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <TeacherBookingCompleteModal v-model="showCompleteModal" :session="completingSession" />

    <!-- ─── Modal: Cancel Booking ─── -->
    <Teleport to="body">
      <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
        <div
          v-dialog="() => (showCancelModal = false)"
          class="glass-panel modal-card"
          style="max-width: 440px"
          role="dialog"
          aria-modal="true"
          aria-labelledby="booking-cancel-title"
        >
          <h3 id="booking-cancel-title" aria-level="2" style="margin-bottom: 0.5rem">
            {{ $t('teacher.booking.cancelModalTitle') }}
          </h3>
          <p
            v-if="cancelTargetSession"
            style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem"
          >
            {{ $t('teacher.booking.cancelConfirmMsg', { title: cancelTargetSession.courseTitle }) }}
          </p>
          <div class="form-group">
            <label for="booking-cancel-reason" class="form-label">{{
              $t('teacher.booking.cancelReasonLabel')
            }}</label>
            <textarea
              id="booking-cancel-reason"
              v-model="cancelReasonText"
              class="form-input"
              rows="3"
              :placeholder="$t('teacher.booking.cancelReasonPlaceholder')"
              style="resize: vertical"
            ></textarea>
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showCancelModal = false">
              {{ $t('teacher.booking.backBtn') }}
            </button>
            <button id="btn-confirm-cancel" class="btn btn-danger" @click="confirmCancelBooking">
              {{ $t('teacher.booking.confirmCancelBtn') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { vDialog } from '@/directives/dialog'
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore } from '@/stores/auth'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingSession } from '@/stores/bookings'
import { useToast } from '@/composables/useToast'
import { useVisibleAttendees } from '@/composables/useVisibleAttendees'
import TeacherBookingCreateModal from '@/components/teacher/TeacherBookingCreateModal.vue'
import TeacherBookingCompleteModal from '@/components/teacher/TeacherBookingCompleteModal.vue'

const { toast } = useToast()
const { t } = useI18n()
const { tStatus, tBookingTime, tLecturerTitle } = useI18nHelper()

const authStore = useAuthStore()
const bookingsStore = useBookingsStore()

// ── Data ─────────────────────────────────────────────────────────────────────

const { attendeesOf } = useVisibleAttendees()

const myBookingSessions = computed(() => {
  const me = authStore.currentUser
  if (!me) return []
  return bookingsStore.getSessionsByTeacher(me.username)
})

// ── Filters ───────────────────────────────────────────────────────────────────

const bookingFilter = ref<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all')

const bookingFilters = computed(() => [
  { value: 'all', label: t('teacher.booking.filterAll'), count: myBookingSessions.value.length },
  {
    value: 'pending',
    label: t('booking.status.pending'),
    count: myBookingSessions.value.filter((s) => s.status === 'pending').length
  },
  {
    value: 'confirmed',
    label: t('booking.status.confirmed'),
    count: myBookingSessions.value.filter((s) => s.status === 'confirmed').length
  },
  {
    value: 'completed',
    label: t('booking.status.completed'),
    count: myBookingSessions.value.filter((s) => s.status === 'completed').length
  },
  {
    value: 'cancelled',
    label: t('booking.status.cancelled'),
    count: myBookingSessions.value.filter((s) => s.status === 'cancelled').length
  }
])

const filteredBookingSessions = computed<BookingSession[]>(() => {
  if (bookingFilter.value === 'all') return myBookingSessions.value
  return myBookingSessions.value.filter((s) => s.status === bookingFilter.value)
})

// ── Create Modal ──────────────────────────────────────────────────────────────

const showCreateBookingModal = ref(false)

function openCreateBooking() {
  showCreateBookingModal.value = true
}

// ── Confirm Modal ─────────────────────────────────────────────────────────────

const showConfirmBookingModal = ref(false)
const confirmingSessionId = ref('')
const confirmForm = ref({ confirmedAt: '' })

function openConfirmBooking(session: BookingSession) {
  confirmingSessionId.value = session.id
  confirmForm.value.confirmedAt = session.proposedAt
  showConfirmBookingModal.value = true
}

function submitConfirmBooking() {
  if (!confirmForm.value.confirmedAt) {
    toast(t('teacher.booking.toastEnterTime'), 'warning')
    return
  }
  bookingsStore.updateSessionStatus(confirmingSessionId.value, 'confirmed', {
    confirmedAt: confirmForm.value.confirmedAt
  })
  showConfirmBookingModal.value = false
  toast(t('teacher.booking.toastTimeConfirmed'))
}

// ── Complete Modal ────────────────────────────────────────────────────────────

const showCompleteModal = ref(false)
const completingSession = ref<BookingSession | null>(null)

function openCompleteBooking(session: BookingSession) {
  completingSession.value = session
  showCompleteModal.value = true
}

// ── Cancel Modal ──────────────────────────────────────────────────────────────

const showCancelModal = ref(false)
const cancelTargetSession = ref<BookingSession | null>(null)
const cancelReasonText = ref('')

function cancelBooking(session: BookingSession) {
  cancelTargetSession.value = session
  cancelReasonText.value = ''
  showCancelModal.value = true
}

function confirmCancelBooking() {
  if (!cancelTargetSession.value) return
  bookingsStore.updateSessionStatus(cancelTargetSession.value.id, 'cancelled', {
    cancelReason: cancelReasonText.value.trim()
  })
  showCancelModal.value = false
  cancelTargetSession.value = null
  toast(t('teacher.booking.toastCancelled'), 'info')
}

// ── Prep Expand ───────────────────────────────────────────────────────────────

const expandedPreps = ref<Set<string>>(new Set())
function togglePrepExpand(sessionId: string) {
  if (expandedPreps.value.has(sessionId)) {
    expandedPreps.value.delete(sessionId)
  } else {
    expandedPreps.value.add(sessionId)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function bookingStatusLabel(status: string): string {
  return tStatus(status) || status
}

function attendanceLabel(status: string): string {
  const map: Record<string, string> = {
    invited: t('student.attendance.invited'),
    attended: t('student.attendance.attended'),
    absent: t('student.attendance.absent')
  }
  return map[status] || status
}

function attendanceIcon(status: string): string {
  return status === 'attended' ? '✅' : status === 'absent' ? '❌' : '📩'
}

/** Expose pending count so parent can show badge */
defineExpose({
  pendingBookingsCount: computed(
    () => myBookingSessions.value.filter((s) => s.status === 'pending').length
  )
})
</script>

<style scoped>
.hidden-attendees-note {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
}
/* [css-migration] moved from TeacherDashboard.vue */
@media (max-width: 640px) {
  .booking-card-header {
    flex-direction: column;
    gap: 0.4rem;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  /* Booking filter tabs */
  .booking-filter-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
  }
}

/* Filter tabs */
.booking-filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.booking-filter-btn {
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 20px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.18s;
  display: flex;
  align-items: center;
  gap: 4px;
}

.filter-count {
  font-size: 0.68rem;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 10px;
  padding: 0 5px;
}

.booking-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.booking-card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.booking-card-actions {
  display: flex;
  gap: 0.4rem;
}

/* Info row */
.booking-info-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem 1.5rem;
}

.booking-info-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.83rem;
}

.info-label {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.info-value {
  font-weight: 600;
  color: var(--text-primary);
}

/* Attendee chips */
.booking-attendees {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
}

/* Prep section */
.booking-prep {
  background: rgba(248, 250, 252, 0.9);
  border: 1px dashed rgba(99, 102, 241, 0.18);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
}

.prep-toggle-label {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
}

.prep-section {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

/* Completed / cancelled notes */
.booking-completed-notes {
  font-size: 0.8rem;
  color: #047857;
  background: rgba(16, 185, 129, 0.06);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
}

.booking-cancel-reason {
  font-size: 0.8rem;
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.06);
  border-radius: 6px;
  padding: 0.4rem 0.75rem;
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
/* [css-migration] moved from TeacherDashboard.vue */
:where(body:has(.teacher-dashboard)) .bookings-panel {
  padding: 1.5rem;
}

:where(body:has(.teacher-dashboard)) .booking-card {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: white;
  border: 1px solid rgba(99, 102, 241, 0.1);
  transition: box-shadow 0.2s;
}

:where(body:has(.teacher-dashboard)) .booking-card:hover {
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.1);
}
</style>

<style scoped>
/* Moved from the parent view, which applied it globally */

.booking-filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
</style>
