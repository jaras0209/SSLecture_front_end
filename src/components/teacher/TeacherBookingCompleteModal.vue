<template>
  <Teleport to="body">
    <div v-if="modelValue && session" class="modal-overlay" @click.self="close()">
      <div
        v-dialog="() => close()"
        class="glass-panel modal-card complete-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-complete-title"
      >
        <h3 id="booking-complete-title" aria-level="2">
          {{ $t('teacher.booking.completeModalTitle') }}
        </h3>
        <p class="text-muted mt-1 text-sm">
          {{ session.courseTitle }} ／
          {{ tLecturerTitle(session.lecturerTitle) }}
          {{ session.lecturerName }} ／ {{ tBookingTime(session) }}
        </p>
        <div class="form-group mt-4">
          <label for="complete-session-notes" class="form-label">{{
            $t('teacher.booking.sessionNotesLabel')
          }}</label>
          <textarea
            id="complete-session-notes"
            v-model="completeForm.teacherNotes"
            class="form-input"
            rows="2"
            :placeholder="$t('teacher.booking.sessionNotesPlaceholder')"
          ></textarea>
        </div>
        <div
          class="complete-attendees mt-4"
          role="group"
          aria-labelledby="complete-attendees-title"
        >
          <span id="complete-attendees-title" class="form-label mb-2">{{
            $t('teacher.booking.attendeeFeedbackLabel')
          }}</span>
          <p v-if="hiddenCount > 0" class="hidden-attendees-note mb-2">
            {{ $t('gender.hiddenAttendees', { n: hiddenCount }) }}
          </p>
          <div v-for="att in attendees" :key="att.studentUsername" class="complete-attendee-card">
            <div class="complete-att-header">
              <div>
                <strong>{{ authStore.displayNameOf(att.studentUsername) }}</strong>
                <span class="text-muted text-xs ml-2">@{{ att.studentUsername }}</span>
              </div>
              <div class="att-status-toggle">
                <button
                  :class="[
                    'att-toggle-btn',
                    {
                      active:
                        completeForm.attendeeData[att.studentUsername]?.attendanceStatus ===
                        'attended'
                    }
                  ]"
                  @click="setAttStatus(att.studentUsername, 'attended')"
                >
                  {{ $t('teacher.booking.attended') }}
                </button>
                <button
                  :class="[
                    'att-toggle-btn danger',
                    {
                      active:
                        completeForm.attendeeData[att.studentUsername]?.attendanceStatus ===
                        'absent'
                    }
                  ]"
                  @click="setAttStatus(att.studentUsername, 'absent')"
                >
                  {{ $t('teacher.booking.absent') }}
                </button>
              </div>
            </div>
            <div class="mt-2">
              <textarea
                v-model="completeForm.attendeeData[att.studentUsername].teacherFeedback"
                class="form-input form-input-sm"
                rows="2"
                :aria-label="
                  $t('teacher.booking.teacherFeedbackPlaceholder', {
                    name: authStore.displayNameOf(att.studentUsername)
                  })
                "
                :placeholder="
                  $t('teacher.booking.teacherFeedbackPlaceholder', {
                    name: authStore.displayNameOf(att.studentUsername)
                  })
                "
              ></textarea>
              <textarea
                v-model="completeForm.attendeeData[att.studentUsername].studentFeedback"
                class="form-input form-input-sm mt-1"
                rows="2"
                :aria-label="
                  $t('teacher.booking.studentFeedbackPlaceholder', {
                    name: authStore.displayNameOf(att.studentUsername)
                  })
                "
                :placeholder="
                  $t('teacher.booking.studentFeedbackPlaceholder', {
                    name: authStore.displayNameOf(att.studentUsername)
                  })
                "
              ></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer mt-4">
          <button class="btn btn-outline" @click="close()">
            {{ $t('common.cancel') }}
          </button>
          <button id="btn-submit-complete" class="btn btn-primary" @click="submit">
            {{ $t('teacher.booking.completeSubmit') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 完成預約：記錄出席與每位學員的回饋。只列出教師看得到的學員，
 * 其他學員的出席狀態維持不變。
 */
import { vDialog } from '@/directives/dialog'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useToast } from '@/composables/useToast'
import { useVisibleAttendees } from '@/composables/useVisibleAttendees'
import { useAuthStore } from '@/stores/auth'
import { useBookingsStore } from '@/stores/bookings'
import type { AttendanceStatus, BookingAttendee, BookingSession } from '@/stores/bookings'

const props = defineProps<{ modelValue: boolean; session: BookingSession | null }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>()

const { t } = useI18n()
const { tBookingTime, tLecturerTitle } = useI18nHelper()
const { toast } = useToast()
const { attendeesOf } = useVisibleAttendees()
const authStore = useAuthStore()
const bookingsStore = useBookingsStore()

type AttendeeForm = {
  attendanceStatus: AttendanceStatus
  teacherFeedback: string
  studentFeedback: string
}

const attendees = ref<BookingAttendee[]>([])
const hiddenCount = ref(0)
const completeForm = ref<{ teacherNotes: string; attendeeData: Record<string, AttendeeForm> }>({
  teacherNotes: '',
  attendeeData: {}
})

// Fill the form from the session each time it opens
watch(
  () => [props.modelValue, props.session] as const,
  ([open, session]) => {
    if (!open || !session) return
    const { shown, hidden } = attendeesOf(session.id)
    attendees.value = shown
    hiddenCount.value = hidden
    completeForm.value = {
      teacherNotes: session.teacherSessionNotes || '',
      attendeeData: Object.fromEntries(
        shown.map((a) => [
          a.studentUsername,
          {
            // someone invited is most likely there; the teacher marks who wasn't
            attendanceStatus: a.attendanceStatus === 'invited' ? 'attended' : a.attendanceStatus,
            teacherFeedback: a.teacherFeedback || '',
            studentFeedback: a.studentFeedback || ''
          }
        ])
      )
    }
  },
  { immediate: true }
)

function setAttStatus(username: string, status: AttendanceStatus) {
  const data = completeForm.value.attendeeData[username]
  if (data) data.attendanceStatus = status
}

function close() {
  emit('update:modelValue', false)
}

function submit() {
  if (!props.session) return
  const sessionId = props.session.id
  Object.entries(completeForm.value.attendeeData).forEach(([username, data]) => {
    bookingsStore.updateAttendee(sessionId, username, { ...data })
  })
  bookingsStore.completeSession(sessionId, completeForm.value.teacherNotes)
  close()
  toast(t('teacher.booking.toastFeedbackSaved'))
}
</script>

<style scoped>
.hidden-attendees-note {
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
}

.complete-attendees {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.complete-attendee-card {
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 0.85rem 1rem;
  background: rgba(248, 250, 252, 0.6);
}

.complete-att-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.att-toggle-btn.active {
  background: rgba(16, 185, 129, 0.15);
  color: #047857;
  border-color: rgba(16, 185, 129, 0.4);
}

.att-toggle-btn.danger.active {
  background: rgba(239, 68, 68, 0.12);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.35);
}
</style>

<style>
/* Global, as it was in the booking panel (see the note there); only while that page is shown */
:where(body:has(.teacher-dashboard)) .complete-modal-card {
  max-width: 580px;
  width: 92%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}
</style>
