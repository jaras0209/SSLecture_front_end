<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="close()">
      <div
        v-dialog="() => close()"
        class="glass-panel modal-card booking-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-create-title"
      >
        <h3 id="booking-create-title" aria-level="2">
          {{ $t('teacher.booking.createModalTitle') }}
        </h3>
        <div class="form-grid mt-4">
          <div class="form-group">
            <label for="booking-course-select" class="form-label">{{
              $t('teacher.booking.fieldCourse')
            }}</label>
            <select
              id="booking-course-select"
              v-model="form.courseId"
              class="form-input"
              @change="onCourseChange"
            >
              <option value="">{{ $t('teacher.booking.selectCourse') }}</option>
              <option v-for="c in coursesStore.courses" :key="c.id" :value="c.id">
                {{ c.title }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="booking-lecturer-select" class="form-label">{{
              $t('teacher.booking.fieldLecturer')
            }}</label>
            <select id="booking-lecturer-select" v-model="form.lecturerId" class="form-input">
              <option value="">{{ $t('teacher.booking.selectLecturer') }}</option>
              <option v-for="l in availableLecturers" :key="l.id" :value="l.id">
                {{ tLecturerTitle(l.title) }} {{ l.name }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label for="booking-time" class="form-label">{{
              $t('teacher.booking.fieldTime')
            }}</label>
            <input
              id="booking-time"
              v-model="form.proposedAt"
              type="datetime-local"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label for="booking-duration" class="form-label">{{
              $t('teacher.booking.fieldDuration')
            }}</label>
            <select id="booking-duration" v-model="form.durationMinutes" class="form-input">
              <option :value="60">60 min</option>
              <option :value="90">90 min</option>
              <option :value="120">120 min</option>
            </select>
          </div>
        </div>

        <div class="form-group mt-3" role="group" aria-labelledby="booking-students-title">
          <span id="booking-students-title" class="form-label">{{
            $t('teacher.booking.fieldStudents')
          }}</span>
          <div class="attendee-selector">
            <label v-for="s in myStudentsList" :key="s.username" class="attendee-check-item">
              <input v-model="form.studentUsernames" type="checkbox" :value="s.username" />
              <span>{{ s.realName || s.displayName || s.username }}</span>
              <span class="att-username-hint">@{{ s.username }}</span>
            </label>
            <div v-if="myStudentsList.length === 0" class="text-muted text-xs italic">
              {{ $t('teacher.booking.noStudents') }}
            </div>
          </div>
        </div>

        <div class="form-group mt-3" role="group" aria-labelledby="booking-prep-title">
          <span id="booking-prep-title" class="form-label">{{
            $t('teacher.booking.fieldPrep')
          }}</span>
          <div class="mb-2">
            <div v-for="(_, i) in form.prep.scriptures" :key="i" class="flex gap-2 mb-1">
              <input
                v-model="form.prep.scriptures[i]"
                class="form-input flex-1"
                :aria-label="$t('teacher.booking.prepScriptureN', { n: i + 1 })"
                :placeholder="$t('common.scripturePlaceholder')"
              />
              <button class="btn btn-sm btn-danger" @click="form.prep.scriptures.splice(i, 1)">
                ✕
              </button>
            </div>
            <button
              id="btn-add-scripture"
              class="btn btn-sm btn-outline mt-1"
              @click="form.prep.scriptures.push('')"
            >
              {{ $t('teacher.booking.addScripture') }}
            </button>
          </div>
          <textarea
            id="booking-prep-notes"
            v-model="form.prep.readingNotes"
            class="form-input"
            rows="2"
            :aria-label="$t('teacher.booking.prepNotesLabel')"
            :placeholder="$t('teacher.booking.prepReadingPlaceholder')"
          ></textarea>
          <input
            id="booking-prep-materials"
            v-model="form.prep.materials"
            class="form-input mt-2"
            :aria-label="$t('teacher.booking.prepMaterialsLabel')"
            :placeholder="$t('teacher.booking.prepMaterialsPlaceholder')"
          />
        </div>

        <div class="modal-footer mt-4">
          <button class="btn btn-outline" @click="close()">
            {{ $t('common.cancel') }}
          </button>
          <button id="btn-submit-booking" class="btn btn-primary" @click="submit">
            {{ $t('teacher.booking.createSubmit') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * 建立預約：選課程、講師、時間、學員與預習內容。只列出教師看得到的學員
 * 與同教會、可教這門課的講師。
 */
import { vDialog } from '@/directives/dialog'
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useToast } from '@/composables/useToast'
import { useVisibleAttendees } from '@/composables/useVisibleAttendees'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import { visibleStudents } from '@/utils/scope'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>()

const { t } = useI18n()
const { tLecturerTitle } = useI18nHelper()
const { toast } = useToast()
const { viewer } = useVisibleAttendees()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const bookingsStore = useBookingsStore()

const myChurch = computed(() => authStore.currentUser?.church || '')

const emptyForm = () => ({
  courseId: '',
  lecturerId: '',
  proposedAt: '',
  durationMinutes: 90,
  studentUsernames: [] as string[],
  prep: { scriptures: [] as string[], readingNotes: '', materials: '' }
})
const form = ref(emptyForm())

// A fresh form each time it opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) form.value = emptyForm()
  }
)

const myStudentsList = computed(() => {
  if (!viewer.value)
    return [] as Array<{ username: string; displayName?: string; realName?: string }>
  return visibleStudents(viewer.value, authStore.usersDb).map((username) => ({
    username,
    ...authStore.usersDb[username]
  }))
})

/** Lecturers of this church, and of the chosen course once one is chosen */
const availableLecturers = computed(() => {
  const courseId = form.value.courseId
  return coursesStore.lecturers.filter(
    (l) => l.church === myChurch.value && (!courseId || l.courseIds.includes(courseId))
  )
})

function onCourseChange() {
  form.value.lecturerId = ''
}

function close() {
  emit('update:modelValue', false)
}

function submit() {
  const f = form.value
  if (!f.courseId || !f.lecturerId || !f.proposedAt) {
    toast(t('teacher.booking.toastSelectCourse'), 'warning')
    return
  }
  if (f.studentUsernames.length === 0) {
    toast(t('teacher.booking.noStudents'), 'warning')
    return
  }
  const course = coursesStore.courses.find((c) => c.id === f.courseId)
  const lecturer = coursesStore.lecturers.find((l) => l.id === f.lecturerId)
  if (!course || !lecturer) return

  const cleanScriptures = f.prep.scriptures.filter((s) => s.trim() !== '')
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
  close()
  toast(t('teacher.booking.toastCreated'))
}
</script>

<style scoped>
.attendee-selector {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 8px;
  padding: 0.75rem;
  background: rgba(248, 250, 252, 0.8);
}

.attendee-check-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.83rem;
  cursor: pointer;
}
</style>

<style>
/* Global, as it was in the booking panel (see the note there); only while that page is shown */
:where(body:has(.teacher-dashboard)) .booking-modal-card {
  max-width: 640px;
  width: 92%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 2rem;
}

:where(body:has(.teacher-dashboard)) .attendee-check-item input[type='checkbox'] {
  accent-color: var(--primary);
  width: 15px;
  height: 15px;
}
</style>
