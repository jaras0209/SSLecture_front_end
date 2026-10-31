<template>
  <section :class="['glass-panel church-bookings-panel', { 'mt-4': allChurches }]">
    <!-- Its own section on the admin page; part of the church overview for a pastor -->
    <component :is="allChurches ? 'h3' : 'h4'" :aria-level="allChurches ? 2 : 3" class="mb-2">
      {{ $t('teacher.churchBookings.title') }}
    </component>
    <p class="section-desc mb-4 text-sm text-muted">
      {{ allChurches ? $t('teacher.churchBookings.descAll') : $t('teacher.churchBookings.desc') }}
    </p>

    <div v-if="allChurches" class="church-filter mb-3">
      <label for="church-bookings-church" class="text-sm">{{
        $t('teacher.churchBookings.churchLabel')
      }}</label>
      <select id="church-bookings-church" v-model="chosenChurch" class="form-input church-select">
        <option value="">{{ $t('teacher.churchBookings.allChurches') }}</option>
        <option v-for="c in CHURCHES" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <div class="status-filters" role="group" :aria-label="$t('teacher.churchBookings.filterLabel')">
      <button
        v-for="f in filters"
        :key="f.value"
        type="button"
        :class="['status-filter-btn', { active: filter === f.value }]"
        :aria-pressed="filter === f.value"
        @click="filter = f.value"
      >
        {{ f.label }} <span class="filter-count">{{ f.count }}</span>
      </button>
    </div>

    <div
      class="table-container mt-4"
      tabindex="0"
      role="region"
      :aria-label="$t('a11y.tableScroll', { title: $t('teacher.churchBookings.caption') })"
    >
      <table class="church-bookings-table">
        <caption class="sr-only">
          {{
            $t('teacher.churchBookings.caption')
          }}
        </caption>
        <thead>
          <tr>
            <th>{{ $t('teacher.booking.time') }}</th>
            <th v-if="showChurch">{{ $t('teacher.churchBookings.colChurch') }}</th>
            <th>{{ $t('teacher.booking.course') }}</th>
            <th>{{ $t('teacher.booking.lecturer') }}</th>
            <th>{{ $t('teacher.churchBookings.colTeacher') }}</th>
            <th>{{ $t('teacher.churchBookings.colStudents') }}</th>
            <th>{{ $t('teacher.churchBookings.colStatus') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in shown" :key="row.session.id" :data-session="row.session.id">
            <td class="nowrap">{{ tBookingTime(row.session) }}</td>
            <td v-if="showChurch" class="nowrap">{{ row.session.church }}</td>
            <td>{{ row.session.courseTitle }}</td>
            <td>{{ row.session.lecturerTitle }} {{ row.session.lecturerName }}</td>
            <td>{{ authStore.displayNameOf(row.session.teacherUsername) }}</td>
            <td>
              <span
                v-for="a in row.attendees"
                :key="a.id"
                class="attendee-chip"
                :title="$t(`student.attendance.${a.attendanceStatus}`)"
              >
                {{ authStore.displayNameOf(a.studentUsername) }}
                <span aria-hidden="true">{{ attendanceIcon(a.attendanceStatus) }}</span>
                <span class="sr-only">{{ $t(`student.attendance.${a.attendanceStatus}`) }}</span>
              </span>
            </td>
            <td>
              <span :class="['status-badge', `status-${row.session.status}`]">
                {{ $t(`booking.status.${row.session.status}`) }}
              </span>
              <p v-if="row.session.cancelReason" class="cancel-reason text-xs text-muted">
                {{ row.session.cancelReason }}
              </p>
            </td>
          </tr>
          <tr v-if="shown.length === 0">
            <td :colspan="showChurch ? 7 : 6" class="text-center empty-row">
              {{ $t('teacher.churchBookings.empty') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * 教會預約總覽（唯讀）：不分教師、不分男女的所有預約。預約由安排的教師管理，
 * 這裡只看整體狀況（哪些待確認、出席情況、取消原因）。
 * - 牧者：傳入 church，只看自己教會
 * - 管理員（SS 中央）：不傳 church，看全部教會，可再選一間教會
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore, CHURCHES } from '@/stores/auth'
import { useBookingsStore } from '@/stores/bookings'
import type { AttendanceStatus, BookingSession, BookingStatus } from '@/stores/bookings'

const props = defineProps<{ church?: string }>()

/** No church given: every church's bookings (admin), optionally narrowed to one */
const allChurches = computed(() => props.church === undefined)
const chosenChurch = ref('')
const church = computed(() => props.church ?? chosenChurch.value)
/** Which church a booking belongs to only needs saying when several are listed */
const showChurch = computed(() => allChurches.value && !chosenChurch.value)

const { t } = useI18n()
const { tBookingTime } = useI18nHelper()
const authStore = useAuthStore()
const bookingsStore = useBookingsStore()

type Filter = 'all' | BookingStatus
const filter = ref<Filter>('all')

const sessionTime = (s: BookingSession) => s.confirmedAt || s.proposedAt

/** The bookings (of the church, or of all churches), latest first, with their attendees */
const rows = computed(() =>
  (church.value
    ? bookingsStore.getSessionsByChurch(church.value)
    : Object.values(bookingsStore.sessionsDb)
  )
    .map((session) => ({
      session,
      attendees: bookingsStore.getAttendeesForSession(session.id)
    }))
    .sort((a, b) => sessionTime(b.session).localeCompare(sessionTime(a.session)))
)

const STATUSES: BookingStatus[] = ['pending', 'confirmed', 'completed', 'cancelled']

const filters = computed(() => [
  { value: 'all' as Filter, label: t('teacher.booking.filterAll'), count: rows.value.length },
  ...STATUSES.map((status) => ({
    value: status as Filter,
    label: t(`booking.status.${status}`),
    count: rows.value.filter((r) => r.session.status === status).length
  }))
])

const shown = computed(() =>
  filter.value === 'all' ? rows.value : rows.value.filter((r) => r.session.status === filter.value)
)

function attendanceIcon(status: AttendanceStatus): string {
  return status === 'attended' ? '✅' : status === 'absent' ? '❌' : '📩'
}
</script>

<style scoped>
.church-filter {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.church-select {
  width: auto;
  min-width: 10rem;
}

.table-container {
  overflow-x: auto;
}

.church-bookings-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.church-bookings-table th {
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  font-weight: 700;
  border-bottom: 2px solid #e2e8f0;
  font-size: 0.9rem;
}

.church-bookings-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: top;
  font-size: 0.9rem;
}

.church-bookings-panel {
  padding: 1.75rem;
  border-radius: var(--radius-lg);
}

.status-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-filter-btn {
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1.5px solid rgba(99, 102, 241, 0.2);
  border-radius: 20px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
}

.status-filter-btn.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}

.filter-count {
  font-size: 0.7rem;
  margin-left: 2px;
}

.nowrap {
  white-space: nowrap;
}

.attendee-chip {
  display: inline-block;
  margin: 0 0.4rem 0.2rem 0;
  white-space: nowrap;
}

.status-badge {
  display: inline-block;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-pending {
  background: rgba(245, 158, 11, 0.15);
  color: #92400e;
}

.status-confirmed {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.status-completed {
  background: rgba(16, 185, 129, 0.15);
  color: #047857;
}

.status-cancelled {
  background: rgba(100, 116, 139, 0.15);
  color: #475569;
}

.cancel-reason {
  margin: 0.25rem 0 0;
}
</style>
