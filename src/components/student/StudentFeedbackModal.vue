<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="modelValue"
        class="modal-overlay"
        @click.self="close"
      >
        <div class="glass-panel modal-card" style="max-width: 480px; width: 92%; padding: 1.75rem;">
          <h3>✍️ {{ $t('student.course.feedbackTitle') }}</h3>
          <p class="text-muted text-sm mt-1" v-if="session">
            {{ session.courseTitle }} ／
            {{ session.lecturerTitle }} {{ session.lecturerName }} ／
            {{ formatBookingTime(session) }}
          </p>
          <div class="form-group mt-4">
            <label class="form-label">📝 {{ $t('student.course.feedbackLabel') }}</label>
            <textarea
              v-model="localFeedback"
              class="form-input"
              rows="5"
              :placeholder="$t('student.course.feedbackPlaceholder')"
              id="student-feedback-textarea"
            ></textarea>
          </div>
          <div class="modal-footer mt-4">
            <button class="btn btn-outline" @click="close">{{ $t('common.cancel') }}</button>
            <button
              class="btn btn-primary"
              @click="submit"
              id="btn-submit-student-feedback"
            >{{ $t('student.course.save') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { BookingSession } from '@/stores/bookings'

const props = defineProps<{
  modelValue: boolean
  session: BookingSession | null
  /** Pre-filled feedback text (when editing existing feedback) */
  initialFeedback?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'submit': [feedback: string]
}>()

const localFeedback = ref(props.initialFeedback ?? '')

// When the modal opens with new data, sync the initial feedback
watch(() => props.initialFeedback, (val) => {
  localFeedback.value = val ?? ''
})

function close() {
  emit('update:modelValue', false)
}

function submit() {
  emit('submit', localFeedback.value)
  close()
}

function formatBookingTime(session: { proposedAt: string; confirmedAt?: string; status: string }): string {
  const dt = session.confirmedAt || session.proposedAt
  if (!dt) return '—'
  const d = new Date(dt)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`
  const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`
  const isPending = !session.confirmedAt && session.status === 'pending'
  return `${dateStr} ${timeStr}${isPending ? '（提議）' : ''}`
}
</script>

<style scoped>
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}
.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-card {
  transform: translateY(12px);
  opacity: 0;
}
</style>
