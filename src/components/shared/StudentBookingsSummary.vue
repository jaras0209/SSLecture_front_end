<template>
  <div class="bookings-summary">
    <p v-if="upcoming.length === 0 && past.length === 0" class="empty-note">
      {{ $t('teacher.drawer.bookings.empty') }}
    </p>

    <template v-for="part in parts" :key="part.key">
      <h6 v-if="part.items.length" aria-level="4" class="part-title">{{ part.title }}</h6>
      <ul v-if="part.items.length" class="summary-list">
        <li
          v-for="{ session, attendee } in part.items"
          :key="session.id"
          class="summary-item"
          :data-session="session.id"
        >
          <div class="summary-row">
            <strong>{{ session.courseTitle }}</strong>
            <span :class="['status-badge', `status-${session.status}`]">{{
              $t(`booking.status.${session.status}`)
            }}</span>
          </div>
          <div class="summary-meta">
            <span>🕐 {{ tBookingTime(session) }}</span>
            <span>🎤 {{ session.lecturerTitle }} {{ session.lecturerName }}</span>
            <span v-if="session.status !== 'cancelled'">
              {{ $t('teacher.drawer.bookings.attendance') }}：{{
                $t(`student.attendance.${attendee.attendanceStatus}`)
              }}
            </span>
          </div>
          <p v-if="session.cancelReason" class="summary-reason">
            {{ $t('teacher.drawer.bookings.cancelReason', { reason: session.cancelReason }) }}
          </p>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * 一位學員的預約（唯讀）：給家長看孩子何時上課、是否出席、是否取消；
 * 教師與牧者在學員抽屜中也看得到。預約本身由安排的教師管理。
 */
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useBookingsStore } from '@/stores/bookings'

const props = defineProps<{ username: string }>()

const { t } = useI18n()
const { tBookingTime } = useI18nHelper()
const bookingsStore = useBookingsStore()

const time = (s: { confirmedAt?: string; proposedAt: string }) => s.confirmedAt || s.proposedAt

/** Coming up, soonest first */
const upcoming = computed(() =>
  [...bookingsStore.getUpcomingSessions(props.username)].sort((a, b) =>
    time(a.session).localeCompare(time(b.session))
  )
)
/** Held, cancelled or past, latest first */
const past = computed(() =>
  [...bookingsStore.getPastSessions(props.username)].sort((a, b) =>
    time(b.session).localeCompare(time(a.session))
  )
)

const parts = computed(() => [
  { key: 'upcoming', title: t('teacher.drawer.bookings.upcoming'), items: upcoming.value },
  { key: 'past', title: t('teacher.drawer.bookings.past'), items: past.value }
])
</script>

<style scoped>
.empty-note {
  color: var(--text-muted);
  font-size: 0.9rem;
}

.part-title {
  margin: 0.75rem 0 0.4rem;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.summary-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-item {
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 0.65rem 0.8rem;
  background: white;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.summary-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.9rem;
  margin-top: 0.3rem;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.summary-reason {
  margin: 0.3rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.status-badge {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
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
</style>
