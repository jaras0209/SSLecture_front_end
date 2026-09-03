<template>
  <!-- Course Notes Form Section -->
  <section class="player-section">
    <div v-if="selectedCourse" class="glass-panel sticky-panel">
      <h3 class="panel-header">📝 {{ $t('profile.student.recordsTitle') }}</h3>

      <!-- Course banner -->
      <div class="course-banner-card mt-4" :style="{ background: selectedCourse.coverColor, padding: '1.5rem', borderRadius: 'var(--radius-md)', color: 'white', boxShadow: 'var(--shadow-sm)' }">
        <h4 style="color: white; font-size: 1.2rem; margin-bottom: 0.25rem; font-weight: 700;">{{ selectedCourse.title }}</h4>
        <p style="color: rgba(255,255,255,0.85); font-size: 0.9rem; margin-bottom: 0;">{{ selectedCourse.description }}</p>
      </div>

      <!-- ── COMPLETED STATE ── -->
      <template v-if="currentRecord?.completed">

        <!-- Session history timeline -->
        <div class="session-history mt-4">
          <h4 class="section-sub-title">📋 {{ $t('profile.student.recordsTitle') }}（{{ $t('student.course.sessionCount', { n: currentRecord?.sessions.length ?? 0 }) }}）</h4>
          <div class="timeline">
            <div
              v-for="(session, idx) in [...(currentRecord?.sessions ?? [])].reverse()"
              :key="session.id"
              class="timeline-item"
            >
              <div class="timeline-dot" :class="idx === 0 ? 'dot-latest' : 'dot-past'"></div>
              <div class="timeline-content glass-panel-sm">

                <!-- View mode header -->
                <div class="timeline-header">
                  <span class="timeline-count">{{ $t('student.course.sessionNo', { n: (currentRecord?.sessions.length ?? 0) - idx }) }}</span>
                  <div class="timeline-actions">
                    <span class="timeline-date">{{ session.listenedAt ? session.listenedAt.replace('T', ' ') : session.createdAt }}</span>
                    <button
                      class="btn-edit-session"
                      @click="startEditSession(session)"
                      v-if="editingSessionId !== session.id"
                      :title="$t('student.course.editTitle')"
                    >✏️</button>
                  </div>
                </div>

                <!-- View mode body -->
                <template v-if="editingSessionId !== session.id">
                  <p class="timeline-lecturer">🎤 {{ session.lecturer || $t('student.course.noLecturerFull') }}</p>
                  <p class="timeline-notes" v-if="session.notes">{{ session.notes }}</p>
                  <p class="timeline-notes text-muted" v-else><em>{{ $t('student.course.noNotes') }}</em></p>
                </template>

                <!-- Edit mode (inline) -->
                <template v-else>
                  <div class="edit-session-form mt-2">
                    <div class="form-group mb-2">
                      <label class="form-label form-label-sm">{{ $t('student.course.editLecturer') }}</label>
                      <select v-model="editSessionDraft.lecturer" class="form-input form-input-sm">
                        <option value="">{{ $t('student.course.selectLecturer') }}</option>
                        <option
                          v-for="lec in availableLecturers"
                          :key="lec.id"
                          :value="lec.name + ' ' + lec.title"
                        >
                          {{ lec.name }} ({{ lec.title }})
                        </option>
                      </select>
                    </div>
                    <div class="form-group mb-2">
                      <label class="form-label form-label-sm">📅 聽課時間：</label>
                      <input
                        v-model="editSessionDraft.listenedAt"
                        type="datetime-local"
                        class="form-input form-input-sm datetime-input"
                      />
                    </div>
                    <div class="form-group mb-2">
                      <label class="form-label form-label-sm">✍️ {{ $t('student.course.notes') }}：</label>
                      <textarea
                        v-model="editSessionDraft.notes"
                        class="form-input form-input-sm text-area"
                        rows="3"
                        :placeholder="$t('student.course.notesPlaceholder')"
                      ></textarea>
                    </div>
                    <div class="edit-session-actions">
                      <button class="btn btn-primary btn-xs" @click="saveEditSession(session.id)">💾 {{ $t('student.course.save') }}</button>
                      <button class="btn btn-ghost btn-xs" @click="cancelEditSession">{{ $t('student.course.cancel') }}</button>
                    </div>
                  </div>
                </template>

              </div>
            </div>
          </div>
        </div>

        <!-- Collapsible review panel -->
        <div class="review-section mt-4">
          <button
            class="btn-review-toggle"
            @click="showReviewPanel = !showReviewPanel"
          >
            <span>{{ showReviewPanel ? '▲' : '▼' }}</span>
            {{ showReviewPanel ? $t('student.course.cancel') : '➕ ' + $t('student.course.recordSession') }}
          </button>

          <transition name="review-slide">
            <div v-if="showReviewPanel" class="review-form mt-3">
              <div class="form-group mb-3">
                <label class="form-label" for="review-lecturer-select">{{ $t('student.course.editLecturer') }}</label>
                <select v-model="selectedLecturer" id="review-lecturer-select" class="form-input">
                  <option value="">{{ $t('student.course.selectLecturer') }}</option>
                  <option
                    v-for="lec in availableLecturers"
                    :key="lec.id"
                    :value="lec.name + ' ' + lec.title"
                  >
                    {{ lec.name }} ({{ lec.title }})
                  </option>
                </select>
              </div>

              <div class="form-group mb-3">
                <label class="form-label" for="review-listened-time">📅 聽課時間：</label>
                <input
                  v-model="listenedAt"
                  id="review-listened-time"
                  type="datetime-local"
                  class="form-input datetime-input"
                />
              </div>

              <div class="form-group mb-3">
                <label class="form-label" for="review-notes-input">✍️ {{ $t('student.course.notes') }}：</label>
                <textarea
                  v-model="notesText"
                  id="review-notes-input"
                  class="form-input text-area"
                  :placeholder="$t('student.course.notesPlaceholder')"
                  rows="4"
                ></textarea>
              </div>

              <div class="save-row mt-3">
                <span class="save-status" v-if="saveStatus">{{ saveStatus }}</span>
                <button class="btn btn-secondary btn-sm" @click="saveNoteAndProgress">
                  💾 {{ $t('student.course.save') }}
                </button>
              </div>
            </div>
          </transition>
        </div>
      </template>

      <!-- ── FIRST TIME STATE ── -->
      <template v-else>
        <div class="notes-container mt-4">
          <div class="form-group mb-3">
            <label class="form-label" for="lecturer-select">{{ $t('student.course.editLecturer') }}</label>
            <select
              v-model="selectedLecturer"
              id="lecturer-select"
              class="form-input"
            >
              <option value="">{{ $t('student.course.selectLecturer') }}</option>
              <option
                v-for="lec in availableLecturers"
                :key="lec.id"
                :value="lec.name + ' ' + lec.title"
              >
                {{ lec.name }} ({{ lec.title }})
              </option>
            </select>
          </div>

          <div class="form-group mb-3">
            <label class="form-label" for="listened-time-input">📅 聽課時間：</label>
            <input
              v-model="listenedAt"
              id="listened-time-input"
              type="datetime-local"
              class="form-input datetime-input"
            />
          </div>

          <label class="form-label" for="notes-input">✍️ {{ $t('student.course.notes') }}</label>
          <textarea
            v-model="notesText"
            id="notes-input"
            class="form-input text-area"
            :placeholder="$t('student.course.notesPlaceholder')"
            rows="5"
          ></textarea>

          <div class="save-row mt-4">
            <span class="save-status" v-if="saveStatus">{{ saveStatus }}</span>
            <button class="btn btn-secondary btn-sm" @click="saveNoteAndProgress">
              💾 {{ $t('student.course.recordSession') }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <div v-else class="glass-panel sticky-panel empty-player-state text-center">
      <div class="empty-emoji">⛪✨</div>
      <h4>{{ $t('student.course.noUpcoming') }}</h4>
      <p class="desc">{{ $t('profile.student.courseTitle') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Course, ListenSession } from '@/stores/courses'

// ── Props ─────────────────────────────────────────────────────────────────────

const props = defineProps<{
  selectedCourse: Course | null
}>()

// ── Stores ────────────────────────────────────────────────────────────────────

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const { t } = useI18n()

// ── Form State ────────────────────────────────────────────────────────────────

const selectedLecturer = ref('')
const notesText = ref('')
const listenedAt = ref(new Date().toISOString().slice(0, 16))
const saveStatus = ref('')
const showReviewPanel = ref(false)

// Inline edit state
const editingSessionId = ref<string | null>(null)
const editSessionDraft = reactive({ lecturer: '', listenedAt: '', notes: '' })

// ── Reset form when course changes ────────────────────────────────────────────

watch(() => props.selectedCourse, () => {
  selectedLecturer.value = ''
  notesText.value = ''
  listenedAt.value = new Date().toISOString().slice(0, 16)
  saveStatus.value = ''
  showReviewPanel.value = false
  editingSessionId.value = null
})

// ── Computed ──────────────────────────────────────────────────────────────────

const currentRecord = computed(() => {
  if (!props.selectedCourse) return null
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentProgress(username, props.selectedCourse.id)
})

const availableLecturers = computed(() => {
  if (!props.selectedCourse) return []
  const courseId = props.selectedCourse.id
  const church = authStore.currentUser?.church || '愛與話語'
  const churchLecturers = coursesStore.getLecturersByChurch(church)
  const list = churchLecturers.filter(l => l.courseIds.includes(courseId))
  return list.length > 0 ? list : churchLecturers
})

// ── Actions ───────────────────────────────────────────────────────────────────

function saveNoteAndProgress() {
  if (!props.selectedCourse || !authStore.currentUser) return

  coursesStore.addListenSession(
    authStore.currentUser.username,
    props.selectedCourse.id,
    {
      lecturer: selectedLecturer.value,
      listenedAt: listenedAt.value,
      notes: notesText.value
    }
  )

  saveStatus.value = '✓ ' + t('student.course.save')
  selectedLecturer.value = ''
  notesText.value = ''
  listenedAt.value = new Date().toISOString().slice(0, 16)
  showReviewPanel.value = false
  setTimeout(() => { saveStatus.value = '' }, 3000)
}

function startEditSession(session: ListenSession) {
  editingSessionId.value = session.id
  editSessionDraft.lecturer = session.lecturer
  editSessionDraft.listenedAt = session.listenedAt
  editSessionDraft.notes = session.notes
}

function saveEditSession(sessionId: string) {
  if (!props.selectedCourse || !authStore.currentUser) return
  coursesStore.updateListenSession(
    authStore.currentUser.username,
    props.selectedCourse.id,
    sessionId,
    {
      lecturer: editSessionDraft.lecturer,
      listenedAt: editSessionDraft.listenedAt,
      notes: editSessionDraft.notes
    }
  )
  editingSessionId.value = null
}

function cancelEditSession() {
  editingSessionId.value = null
}
</script>
