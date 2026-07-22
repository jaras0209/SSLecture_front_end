<template>
  <div class="dashboard-body no-print">
    <section class="glass-panel bookings-panel">
      <div class="panel-header-row">
        <h3 class="section-title">📅 聽課預約管理</h3>
        <button class="btn btn-primary" @click="openCreateBooking" id="btn-create-booking">
          ➕ 新增預約
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
              <span v-if="session.isGroupSession" class="booking-group-badge">👥 團體場次</span>
            </div>
            <div class="booking-card-actions">
              <button v-if="session.status === 'pending'" class="btn btn-sm btn-outline" @click="openConfirmBooking(session)">✅ 確認時間</button>
              <button v-if="session.status === 'confirmed'" class="btn btn-sm btn-primary" @click="openCompleteBooking(session)">🎉 標記完成</button>
              <button v-if="session.status === 'pending' || session.status === 'confirmed'" class="btn btn-sm btn-danger" @click="cancelBooking(session)">取消</button>
            </div>
          </div>

          <div class="booking-info-row mt-2">
            <div class="booking-info-item">
              <span class="info-label">📚 課程</span>
              <span class="info-value">{{ session.courseTitle }}</span>
            </div>
            <div class="booking-info-item">
              <span class="info-label">🎤 講師</span>
              <span class="info-value">{{ session.lecturerTitle }} {{ session.lecturerName }}</span>
            </div>
            <div class="booking-info-item">
              <span class="info-label">🕐 時間</span>
              <span class="info-value">{{ formatBookingTime(session) }}</span>
            </div>
            <div class="booking-info-item" v-if="session.durationMinutes">
              <span class="info-label">⏱ 時長</span>
              <span class="info-value">{{ session.durationMinutes }} 分鐘</span>
            </div>
          </div>

          <div class="booking-attendees mt-2">
            <span class="info-label">👤 學員：</span>
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
              <span class="prep-toggle-label">📖 預習內容</span>
              <span>{{ expandedPreps.has(session.id) ? '▲' : '▼' }}</span>
            </div>
            <div v-if="expandedPreps.has(session.id)" class="prep-body mt-1">
              <div v-if="session.prep.scriptures.length" class="prep-section">
                <strong>📜 預習經文：</strong>
                <span v-for="(s, i) in session.prep.scriptures" :key="i" class="scripture-chip">{{ s }}</span>
              </div>
              <div v-if="session.prep.readingNotes" class="prep-section mt-1">
                <strong>📝 準備說明：</strong>{{ session.prep.readingNotes }}
              </div>
              <div v-if="session.prep.materials" class="prep-section mt-1">
                <strong>📎 補充材料：</strong>{{ session.prep.materials }}
              </div>
            </div>
          </div>

          <div v-if="session.status === 'completed' && session.teacherSessionNotes" class="booking-completed-notes mt-2">
            <strong>🗒️ 場次記錄：</strong>{{ session.teacherSessionNotes }}
          </div>
          <div v-if="session.status === 'cancelled' && session.cancelReason" class="booking-cancel-reason mt-2">
            <strong>❌ 取消原因：</strong>{{ session.cancelReason }}
          </div>
        </div>

        <div v-if="filteredBookingSessions.length === 0" class="text-center text-muted py-8 italic">
          {{ bookingFilter === 'all' ? '目前沒有任何預約紀錄，點擊「新增預約」開始' : '此狀態下沒有預約' }}
        </div>
      </div>
    </section>

    <!-- ─── Modal: 新增預約 ─── -->
    <Teleport to="body">
      <div v-if="showCreateBookingModal" class="modal-overlay" @click.self="showCreateBookingModal = false">
        <div class="glass-panel modal-card booking-modal-card">
          <h3>➕ 新增聽課預約</h3>
          <div class="form-grid mt-4">
            <div class="form-group">
              <label class="form-label">📚 課程 *</label>
              <select v-model="bookingForm.courseId" class="form-input" id="booking-course-select" @change="onBookingCourseChange">
                <option value="">請選擇課程</option>
                <option v-for="c in coursesStore.courses" :key="c.id" :value="c.id">{{ c.title }}</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">🎤 講師 *</label>
              <select v-model="bookingForm.lecturerId" class="form-input" id="booking-lecturer-select">
                <option value="">請選擇講師</option>
                <option v-for="l in availableLecturers" :key="l.id" :value="l.id">
                  {{ l.title }} {{ l.name }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">🕐 提議時間 *</label>
              <input type="datetime-local" v-model="bookingForm.proposedAt" class="form-input" id="booking-time" />
            </div>
            <div class="form-group">
              <label class="form-label">⏱ 預計時長</label>
              <select v-model="bookingForm.durationMinutes" class="form-input" id="booking-duration">
                <option :value="60">60 分鐘</option>
                <option :value="90">90 分鐘</option>
                <option :value="120">120 分鐘</option>
              </select>
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">👤 參與學員（可多選）</label>
            <div class="attendee-selector">
              <label v-for="s in myStudentsList" :key="s.username" class="attendee-check-item">
                <input type="checkbox" :value="s.username" v-model="bookingForm.studentUsernames" />
                <span>{{ s.realName || s.displayName || s.username }}</span>
                <span class="att-username-hint">@{{ s.username }}</span>
              </label>
              <div v-if="myStudentsList.length === 0" class="text-muted text-xs italic">您目前沒有直接負責的學員</div>
            </div>
          </div>

          <div class="form-group mt-3">
            <label class="form-label">📖 預習內容（選填）</label>
            <div class="mb-2">
              <div class="flex gap-2 mb-1" v-for="(_, i) in bookingForm.prep.scriptures" :key="i">
                <input class="form-input flex-1" v-model="bookingForm.prep.scriptures[i]" :placeholder="`如：約翰福音 1:1-18`" />
                <button class="btn btn-sm btn-danger" @click="bookingForm.prep.scriptures.splice(i, 1)">✕</button>
              </div>
              <button class="btn btn-sm btn-outline mt-1" @click="bookingForm.prep.scriptures.push('')" id="btn-add-scripture">＋ 新增經文</button>
            </div>
            <textarea v-model="bookingForm.prep.readingNotes" class="form-input" rows="2" placeholder="需要做什麼準備？" id="booking-prep-notes"></textarea>
            <input class="form-input mt-2" v-model="bookingForm.prep.materials" placeholder="補充材料說明（選填）" id="booking-prep-materials" />
          </div>

          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showCreateBookingModal = false">取消</button>
            <button class="btn btn-primary" @click="submitCreateBooking" id="btn-submit-booking">建立預約</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal: 確認時間 ─── -->
    <Teleport to="body">
      <div v-if="showConfirmBookingModal" class="modal-overlay" @click.self="showConfirmBookingModal = false">
        <div class="glass-panel modal-card" style="max-width:420px;width:90%;padding:1.5rem;">
          <h3>✅ 確認聽課時間</h3>
          <p class="text-muted mt-2 text-sm">與講師商定的最終時間（可與提議時間不同）。</p>
          <div class="form-group mt-3">
            <label class="form-label">確認時間 *</label>
            <input type="datetime-local" v-model="confirmForm.confirmedAt" class="form-input" id="confirm-time-input" />
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showConfirmBookingModal = false">取消</button>
            <button class="btn btn-primary" @click="submitConfirmBooking" id="btn-submit-confirm">確認時間</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ─── Modal: 標記完成 + 回饋 ─── -->
    <Teleport to="body">
      <div v-if="showCompleteModal" class="modal-overlay" @click.self="showCompleteModal = false">
        <div class="glass-panel modal-card complete-modal-card">
          <h3>🎉 課後回饋記錄</h3>
          <p class="text-muted mt-1 text-sm" v-if="completingSession">
            {{ completingSession.courseTitle }} ／ {{ completingSession.lecturerTitle }} {{ completingSession.lecturerName }}
            ／ {{ formatBookingTime(completingSession) }}
          </p>
          <div class="form-group mt-4">
            <label class="form-label">🗒️ 場次整體備注（教師填）</label>
            <textarea v-model="completeForm.teacherNotes" class="form-input" rows="2" placeholder="整體場次情況..." id="complete-session-notes"></textarea>
          </div>
          <div class="complete-attendees mt-4">
            <label class="form-label mb-2">👤 個別學員回饋</label>
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
                  >✅ 已出席</button>
                  <button
                    :class="['att-toggle-btn danger', { active: completeForm.attendeeData[att.studentUsername]?.attendanceStatus === 'absent' }]"
                    @click="setAttStatus(att.studentUsername, 'absent')"
                  >❌ 缺席</button>
                </div>
              </div>
              <div class="mt-2">
                <textarea
                  v-model="completeForm.attendeeData[att.studentUsername].teacherFeedback"
                  class="form-input form-input-sm"
                  rows="2"
                  :placeholder="`對 ${getStudentDisplayName(att.studentUsername)} 的個別回饋`"
                ></textarea>
                <textarea
                  v-model="completeForm.attendeeData[att.studentUsername].studentFeedback"
                  class="form-input form-input-sm mt-1"
                  rows="2"
                  :placeholder="`${getStudentDisplayName(att.studentUsername)} 的課後心得（可代填）`"
                ></textarea>
              </div>
            </div>
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="showCompleteModal = false">取消</button>
            <button class="btn btn-primary" @click="submitCompleteBooking" id="btn-submit-complete">儲存回饋並標記完成</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import type { BookingSession, BookingAttendee, AttendanceStatus } from '@/stores/bookings'
import { useToast } from '@/composables/useToast'

const { toast, confirm } = useToast()

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
  { value: 'all',       label: '全部',      count: myBookingSessions.value.length },
  { value: 'pending',   label: '⏳ 待確認', count: myBookingSessions.value.filter(s => s.status === 'pending').length },
  { value: 'confirmed', label: '📅 已確認', count: myBookingSessions.value.filter(s => s.status === 'confirmed').length },
  { value: 'completed', label: '✅ 已完成', count: myBookingSessions.value.filter(s => s.status === 'completed').length },
  { value: 'cancelled', label: '❌ 已取消', count: myBookingSessions.value.filter(s => s.status === 'cancelled').length },
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
    toast('請填寫必填欄位：課程、講師、提議時間', 'warning')
    return
  }
  if (f.studentUsernames.length === 0) {
    toast('請至少選擇一位學員', 'warning')
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
  toast('✅ 預約已建立！')
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
    toast('請填寫確認時間', 'warning')
    return
  }
  bookingsStore.updateSessionStatus(confirmingSessionId.value, 'confirmed', {
    confirmedAt: confirmForm.value.confirmedAt
  })
  showConfirmBookingModal.value = false
  toast('✅ 時間已確認！')
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
  toast('✅ 課後回饋已儲存，場次標記為完成！')
}

// ── Cancel ────────────────────────────────────────────────────────────────────

async function cancelBooking(session: BookingSession) {
  const ok = await confirm(`確定取消這場預約嗎？`)
  if (!ok) return
  bookingsStore.updateSessionStatus(session.id, 'cancelled', { cancelReason: '' })
  toast('預約已取消', 'info')
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
  const map: Record<string, string> = {
    pending: '⏳ 待確認', confirmed: '📅 已確認',
    completed: '✅ 已完成', cancelled: '❌ 已取消'
  }
  return map[status] || status
}

function attendanceLabel(status: string): string {
  const map: Record<string, string> = { invited: '已邀請', attended: '已出席', absent: '缺席' }
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
  return `${dateStr} ${timeStr}${isPending ? '（提議）' : ''}`
}

function getStudentDisplayName(username: string): string {
  const u = authStore.usersDb[username]
  return u?.realName || u?.displayName || username
}

/** Expose pending count so parent can show badge */
defineExpose({ pendingBookingsCount: computed(() => myBookingSessions.value.filter(s => s.status === 'pending').length) })
</script>
