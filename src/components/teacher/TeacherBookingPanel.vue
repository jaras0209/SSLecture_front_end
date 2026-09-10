<template>
  <div class="dashboard-body no-print">
    <section class="glass-panel bookings-panel">
      <div class="panel-header-row">
        <h3 class="section-title">{{ $t('teacher.booking.title') }}</h3>
        <button class="btn btn-primary" @click="openCreateBooking" id="btn-create-booking">
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
              <span v-if="session.isGroupSession" class="booking-group-badge">{{ $t('teacher.booking.groupSession') }}</span>
            </div>
            <div class="booking-card-actions">
              <button v-if="session.status === 'pending'" class="btn btn-sm btn-outline" @click="openConfirmBooking(session)">{{ $t('teacher.booking.confirmTime') }}</button>
              <button v-if="session.status === 'confirmed'" class="btn btn-sm btn-primary" @click="openCompleteBooking(session)">{{ $t('teacher.booking.markComplete') }}</button>
              <button v-if="session.status === 'pending' || session.status === 'confirmed'" class="btn btn-sm btn-danger" @click="cancelBooking(session)">{{ $t('teacher.booking.cancelBtn') }}</button>
            </div>
          </div>

          <div class="booking-info-row mt-2">
            <div class="booking-info-item">
              <span class="info-label">{{ $t('teacher.booking.course') }}</span>
              <span class="info-value">{{ session.courseTitle }}</span>
            </div>
            <div class="booking-info-item">
              <span class="info-label">{{ $t('teacher.booking.lecturer') }}</span>
              <span class="info-value">{{ session.lecturerTitle }} {{ session.lecturerName }}</span>
            </div>
            <div class="booking-info-item">
              <span class="info-label">{{ $t('teacher.booking.time') }}</span>
              <span class="info-value">{{ formatBookingTime(session) }}</span>
            </div>
            <div class="booking-info-item" v-if="session.durationMinutes">
              <span class="info-label">{{ $t('teacher.booking.duration') }}</span>
              <span class="info-value">{{ $t('teacher.booking.minutes', { n: session.durationMinutes }) }}</span>
            </div>
          </div>

          <div class="booking-attendees mt-2">
            <span class="info-label">{{ $t('teacher.booking.attendees') }}</span>
            <span
              v-for="att in bookingsStore.getAttendeesForSession(session.id)"
              :key="att.id"
              :class="['att-chip', `att-${att.attendanceStatus}`]"
            >
              {{ getStudentDisplayName(att.studentUsername) }}
              <span :title="attendanceLabel(att.attendanceStatus)">{{ attendanceIcon(att.attendanceStatus) }}</span>
            </span>
          </div>

          <div v-if="session.prep.scriptures.length || session.prep.readingNotes || session.prep.materials" class="booking-prep mt-2">
            <div class="prep-header" @click="togglePrepExpand(session.id)" style="cursor:pointer; display:flex; align-items:center; gap:0.5rem;">
              <span class="prep-toggle-label">{{ $t('teacher.booking.prepTitle') }}</span>
              <span>{{ expandedPreps.has(session.id) ? '▲' : '▼' }}</span>
            </div>
            <div v-if="expandedPreps.has(session.id)" class="prep-body mt-1">
              <div v-if="session.prep.scriptures.length" class="prep-section">
                <strong>{{ $t('teacher.booking.prepScriptures') }}</strong>
                <span v-for="(s, i) in session.prep.scriptures" :key="i" class="scripture-chip">{{ s }}</span>
              </div>
              <div v-if="session.prep.readingNotes" class="prep-section mt-1">
                <strong>{{ $t('teacher.booking.prepNotes') }}</strong>{{ session.prep.readingNotes }}
              </div>
              <div v-if="session.prep.materials" class="prep-section mt-1">
                <strong>{{ $t('teacher.booking.prepMaterials') }}</strong>{{ session.prep.materials }}
              </div>
            </div>
          </div>

          <div v-if="session.status === 'completed' && session.teacherSessionNotes" class="booking-completed-notes mt-2">
            <strong>{{ $t('teacher.booking.sessionNotes') }}</strong>{{ session.teacherSessionNotes }}
          </div>
          <div v-if="session.status === 'cancelled' && session.cancelReason" class="booking-cancel-reason mt-2">
            <strong>{{ $t('teacher.booking.cancelReason') }}</strong>{{ session.cancelReason }}
          </div>
        </div>

        <div v-if="filteredBookingSessions.length === 0" class="text-center text-muted py-8 italic">
          {{ bookingFilter === 'all' ? $t('teacher.booking.emptyAll') : $t('teacher.booking.emptyFiltered') }}
        </div>
      </div>
    </section>

    <!-- ─── Modal: Create Booking ─── -->
    <Teleport to="body">
      <div v-if="showCreateBookingModal" class="modal-overlay" @click.self="showCreateBookingModal = false">
        <div class="glass-panel modal-card booking-modal-card">
          <h3>{{ $t('teacher.booking.createModalTitle') }}</h3>
          <div class="form-grid mt-4">
            <div class="form-group">
              <label class="form-label">{{ $t('teacher.booking.fieldCourse') }}</label>
              <select v-model="bookingForm.courseId" class="form-input" id="booking-course-select" @change="onBookingCourseChange">
                <option value="">{{ $t('teacher.booking.selectCourse') }}</option>
                <option v-for="c in coursesStore.courses" :key="c.id" :value="c.id">{{ c.title }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('teacher.booking.fieldLecturer') }}</label>
              <select v-model="bookingForm.lecturerId" class="form-input" id="booking-lecturer-select">
                <option value="">{{ $t('teacher.booking.selectLecturer') }}</option>
                <option v-for="l in availableLecturers" :key="l.id" :value="l.id">
                  {{ l.title }} {{ l.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('teacher.booking.fieldTime') }}</label>
              <input type="datetime-local" v-model="bookingForm.proposedAt" class="form-input" id="booking-time" />
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('teacher.booking.fieldDuration') }}</label>
              <select v-model="bookingForm.durationMinutes" class="form-input" id="booking-duration">
                <option :value="60">60 min</option>
                <option :value="90">90 min</option>
                <option :value="120">120 min</option>
              </select>
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">{{ $t('teacher.booking.fieldStudents') }}</label>
            <div class="attendee-selector">
              <label v-for="s in myStudentsList" :key="s.username" class="attendee-check-item">
                <input type="checkbox" :value="s.username" v-model="bookingForm.studentUsernames" />
                <span>{{ s.realName || s.displayName || s.username }}</span>
                <span class="att-username-hint">@{{ s.username }}</span>
              </label>
              <div v-if="myStudentsList.length === 0" class="text-muted text-xs italic">{{ $t('teacher.booking.noStudents') }}</div>
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">{{ $t('teacher.booking.fieldPrep') }}</label>
            <div class="mb-2">
              <div class="flex gap-2 mb-1" v-for="(_, i) in bookingForm.prep.scriptures" :key="i">
                <input class="form-input flex-1" v-model="bookingForm.prep.scriptures[i]" :placeholder="`如：約翰福音 1:1-18`" />
                <button class="btn btn-sm btn-danger" @click="bookingForm.prep.scriptures.splice(i, 1)">✕</button>
              </div>
              <button class="btn btn-sm btn-outline mt-1" @click="bookingForm.prep.scriptures.push('')" id="btn-add-scripture">{{ $t('teacher.booking.addScripture') }}</button>
            </div>
            <textarea v-model="bookingForm.prep.readingNotes" class="form-input" rows="2" :placeholder="$t('teacher.booking.prepReadingPlaceholder')" id="booking-prep-notes"></textarea>
            <input class="form-input mt-2" v-model="bookingForm.prep.materials" :placeholder="$t('teacher.booking.prepMaterialsPlaceholder')" id="booking-prep-materials" />
          </div>

          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showCreateBookingModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="submitCreateBooking" id="btn-submit-booking">{{ $t('teacher.booking.createSubmit') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal: Confirm Time ─── -->
    <Teleport to="body">
      <div v-if="showConfirmBookingModal" class="modal-overlay" @click.self="showConfirmBookingModal = false">
        <div class="glass-panel modal-card" style="max-width:420px;width:90%;padding:1.5rem;">
          <h3>{{ $t('teacher.booking.confirmModalTitle') }}</h3>
          <p class="text-muted mt-2 text-sm">{{ $t('teacher.booking.confirmModalDesc') }}</p>
          <div class="form-group mt-3">
            <label class="form-label">{{ $t('teacher.booking.confirmTimeLabel') }}</label>
            <input type="datetime-local" v-model="confirmForm.confirmedAt" class="form-input" id="confirm-time-input" />
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showConfirmBookingModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="submitConfirmBooking" id="btn-submit-confirm">{{ $t('teacher.booking.confirmSubmit') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal: Mark Complete + Feedback ─── -->
    <Teleport to="body">
      <div v-if="showCompleteModal" class="modal-overlay" @click.self="showCompleteModal = false">
        <div class="glass-panel modal-card complete-modal-card">
          <h3>{{ $t('teacher.booking.completeModalTitle') }}</h3>
          <p class="text-muted mt-1 text-sm" v-if="completingSession">
            {{ completingSession.courseTitle }} ／ {{ completingSession.lecturerTitle }} {{ completingSession.lecturerName }}
            ／ {{ formatBookingTime(completingSession) }}
          </p>
          <div class="form-group mt-4">
            <label class="form-label">{{ $t('teacher.booking.sessionNotesLabel') }}</label>
            <textarea v-model="completeForm.teacherNotes" class="form-input" rows="2" :placeholder="$t('teacher.booking.sessionNotesPlaceholder')" id="complete-session-notes"></textarea>
          </div>
          <div class="complete-attendees mt-4">
            <label class="form-label mb-2">{{ $t('teacher.booking.attendeeFeedbackLabel') }}</label>
            <div v-for="att in completingAttendees" :key="att.studentUsername" class="complete-attendee-card">
              <div class="complete-att-header">
                <div>
                  <strong>{{ getStudentDisplayName(att.studentUsername) }}</strong>
                  <span class="text-muted text-xs ml-2">@{{ att.studentUsername }}</span>
                </div>
                <div class="att-status-toggle">
                  <button
                    :class="['att-toggle-btn', { active: completeForm.attendeeData[att.studentUsername]?.attendanceStatus === 'attended' }]"
                    @click="setAttStatus(att.studentUsername, 'attended')"
                  >{{ $t('teacher.booking.attended') }}</button>
                  <button
                    :class="['att-toggle-btn danger', { active: completeForm.attendeeData[att.studentUsername]?.attendanceStatus === 'absent' }]"
                    @click="setAttStatus(att.studentUsername, 'absent')"
                  >{{ $t('teacher.booking.absent') }}</button>
                </div>
              </div>
              <div class="mt-2">
                <textarea
                  v-model="completeForm.attendeeData[att.studentUsername].teacherFeedback"
                  class="form-input form-input-sm"
                  rows="2"
                  :placeholder="$t('teacher.booking.teacherFeedbackPlaceholder', { name: getStudentDisplayName(att.studentUsername) })"
                ></textarea>
                <textarea
                  v-model="completeForm.attendeeData[att.studentUsername].studentFeedback"
                  class="form-input form-input-sm mt-1"
                  rows="2"
                  :placeholder="$t('teacher.booking.studentFeedbackPlaceholder', { name: getStudentDisplayName(att.studentUsername) })"
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showCompleteModal = false">{{ $t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="submitCompleteBooking" id="btn-submit-complete">{{ $t('teacher.booking.completeSubmit') }}</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal: Cancel Booking ─── -->
    <Teleport to="body">
      <div v-if="showCancelModal" class="modal-overlay" @click.self="showCancelModal = false">
        <div class="glass-panel modal-card" style="max-width: 440px;">
          <h3 style="margin-bottom: 0.5rem;">{{ $t('teacher.booking.cancelModalTitle') }}</h3>
          <p v-if="cancelTargetSession" style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 1.25rem;">
            {{ $t('teacher.booking.cancelConfirmMsg', { title: cancelTargetSession.courseTitle }) }}
          </p>
          <div class="form-group">
            <label class="form-label">{{ $t('teacher.booking.cancelReasonLabel') }}</label>
            <textarea
              v-model="cancelReasonText"
              class="form-input"
              rows="3"
              :placeholder="$t('teacher.booking.cancelReasonPlaceholder')"
              style="resize: vertical;"
            ></textarea>
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showCancelModal = false">{{ $t('teacher.booking.backBtn') }}</button>
            <button class="btn btn-danger" @click="confirmCancelBooking" id="btn-confirm-cancel">{{ $t('teacher.booking.confirmCancelBtn') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingSession, BookingAttendee, AttendanceStatus } from '@/stores/bookings'
import { useToast } from '@/composables/useToast'

const { toast } = useToast()
const { t } = useI18n()

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const bookingsStore = useBookingsStore()

// ── Data ─────────────────────────────────────────────────────────────────────

const myChurch = computed(() => authStore.currentUser?.church || '')

const myStudentsList = computed(() => {
  const me = authStore.currentUser
  if (!me) return [] as Array<{ username: string; displayName?: string; realName?: string }>
  return Object.entries(authStore.usersDb)
    .filter(([, u]) => u.role === 'student' && u.church === me.church)
    .map(([username, u]) => ({ username, ...u }))
})

const myBookingSessions = computed(() => {
  const me = authStore.currentUser
  if (!me) return []
  return bookingsStore.getSessionsByTeacher(me.username)
})

// ── Filters ───────────────────────────────────────────────────────────────────

const bookingFilter = ref<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all')

const bookingFilters = computed(() => [
  { value: 'all',       label: t('teacher.booking.filterAll'),          count: myBookingSessions.value.length },
  { value: 'pending',   label: t('booking.status.pending'),             count: myBookingSessions.value.filter(s => s.status === 'pending').length },
  { value: 'confirmed', label: t('booking.status.confirmed'),           count: myBookingSessions.value.filter(s => s.status === 'confirmed').length },
  { value: 'completed', label: t('booking.status.completed'),           count: myBookingSessions.value.filter(s => s.status === 'completed').length },
  { value: 'cancelled', label: t('booking.status.cancelled'),           count: myBookingSessions.value.filter(s => s.status === 'cancelled').length },
])

const filteredBookingSessions = computed<BookingSession[]>(() => {
  if (bookingFilter.value === 'all') return myBookingSessions.value
  return myBookingSessions.value.filter(s => s.status === bookingFilter.value)
})

const availableLecturers = computed(() => {
  const courseId = bookingForm.value.courseId
  if (!courseId) return coursesStore.lecturers.filter(l => l.church === myChurch.value)
  return coursesStore.lecturers.filter(l =>
    l.church === myChurch.value && l.courseIds.includes(courseId)
  )
})

// ── Create Modal ──────────────────────────────────────────────────────────────

const showCreateBookingModal = ref(false)
const bookingForm = ref({
  courseId: '',
  lecturerId: '',
  proposedAt: '',
  durationMinutes: 90,
  studentUsernames: [] as string[],
  prep: { scriptures: [] as string[], readingNotes: '', materials: '' }
})

function openCreateBooking() {
  bookingForm.value = {
    courseId: '', lecturerId: '', proposedAt: '',
    durationMinutes: 90, studentUsernames: [],
    prep: { scriptures: [], readingNotes: '', materials: '' }
  }
  showCreateBookingModal.value = true
}

function onBookingCourseChange() {
  bookingForm.value.lecturerId = ''
}

function submitCreateBooking() {
  const f = bookingForm.value
  if (!f.courseId || !f.lecturerId || !f.proposedAt) {
    toast(t('teacher.booking.toastSelectCourse'), 'warning')
    return
  }
  if (f.studentUsernames.length === 0) {
    toast(t('teacher.booking.noStudents'), 'warning')
    return
  }
  const course = coursesStore.courses.find(c => c.id === f.courseId)
  const lecturer = coursesStore.lecturers.find(l => l.id === f.lecturerId)
  if (!course || !lecturer) return

  const cleanScriptures = f.prep.scriptures.filter(s => s.trim() !== '')
  bookingsStore.createSession({
    courseId: f.courseId,
    courseTitle: course.title,
    lecturerId: f.lecturerId,
    lecturerName: lecturer.name,
    lecturerTitle: lecturer.title,
    teacherUsername: authStore.currentUser!.username,
    proposedAt: f.proposedAt,
    durationMinutes: f.durationMinutes,
    prep: { ...f.prep, scriptures: cleanScriptures },
    studentUsernames: f.studentUsernames,
    church: myChurch.value
  })
  showCreateBookingModal.value = false
  toast(t('teacher.booking.toastCreated'))
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
const completingAttendees = ref<BookingAttendee[]>([])
const completeForm = ref<{
  teacherNotes: string
  attendeeData: Record<string, { attendanceStatus: AttendanceStatus; teacherFeedback: string; studentFeedback: string }>
}>({ teacherNotes: '', attendeeData: {} })

function openCompleteBooking(session: BookingSession) {
  completingSession.value = session
  completingAttendees.value = bookingsStore.getAttendeesForSession(session.id)
  completeForm.value = {
    teacherNotes: session.teacherSessionNotes || '',
    attendeeData: Object.fromEntries(
      completingAttendees.value.map(a => [a.studentUsername, {
        attendanceStatus: (a.attendanceStatus === 'invited' ? 'attended' : a.attendanceStatus) as AttendanceStatus,
        teacherFeedback: a.teacherFeedback || '',
        studentFeedback: a.studentFeedback || ''
      }])
    )
  }
  showCompleteModal.value = true
}

function setAttStatus(username: string, status: AttendanceStatus) {
  if (completeForm.value.attendeeData[username]) {
    completeForm.value.attendeeData[username].attendanceStatus = status
  }
}

function submitCompleteBooking() {
  if (!completingSession.value) return
  const sessionId = completingSession.value.id
  Object.entries(completeForm.value.attendeeData).forEach(([username, data]) => {
    bookingsStore.updateAttendee(sessionId, username, {
      attendanceStatus: data.attendanceStatus,
      teacherFeedback: data.teacherFeedback,
      studentFeedback: data.studentFeedback
    })
  })
  bookingsStore.completeSession(sessionId, completeForm.value.teacherNotes)
  showCompleteModal.value = false
  toast(t('teacher.booking.toastFeedbackSaved'))
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
  return (t as any)(`booking.status.${status}`) || status
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

function formatBookingTime(session: { confirmedAt?: string; proposedAt: string; status: string }): string {
  const dt = session.confirmedAt || session.proposedAt
  if (!dt) return '—'
  const d = new Date(dt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const isPending = !session.confirmedAt && session.status === 'pending'
  return `${dateStr} ${timeStr}${isPending ? t('student.attendance.proposed') : ''}`
}

function getStudentDisplayName(username: string): string {
  const u = authStore.usersDb[username]
  return u?.realName || u?.displayName || username
}

/** Expose pending count so parent can show badge */
defineExpose({ pendingBookingsCount: computed(() => myBookingSessions.value.filter(s => s.status === 'pending').length) })
</script>
