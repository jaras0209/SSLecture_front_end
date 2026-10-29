<template>
  <!-- Course Notes Form Section -->
  <section class="player-section">
    <div v-if="selectedCourse" class="glass-panel sticky-panel">
      <h3 class="panel-header">📝 {{ $t('profile.student.recordsTitle') }}</h3>

      <!-- Course banner -->
      <div
        class="course-banner-card mt-4"
        :style="{
          background: selectedCourse.coverColor,
          padding: '1.5rem',
          borderRadius: 'var(--radius-md)',
          color: 'white',
          boxShadow: 'var(--shadow-sm)'
        }"
      >
        <h4 style="color: white; font-size: 1.2rem; margin-bottom: 0.25rem; font-weight: 700">
          {{ selectedCourse.title }}
        </h4>
        <p style="color: rgba(255, 255, 255, 0.85); font-size: 0.9rem; margin-bottom: 0">
          {{ selectedCourse.description }}
        </p>
      </div>

      <!-- ── COMPLETED STATE ── -->
      <template v-if="currentRecord?.completed">
        <!-- Session history timeline -->
        <div class="session-history mt-4">
          <h4 class="section-sub-title">
            📋 {{ $t('profile.student.recordsTitle') }}（{{
              $t('student.course.sessionCount', { n: currentRecord?.sessions.length ?? 0 })
            }}）
          </h4>
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
                  <span class="timeline-count">{{
                    $t('student.course.sessionNo', {
                      n: (currentRecord?.sessions.length ?? 0) - idx
                    })
                  }}</span>
                  <div class="timeline-actions">
                    <span class="timeline-date">{{
                      session.listenedAt
                        ? session.listenedAt.replace('T', ' ')
                        : tDateTime(session.createdAt)
                    }}</span>
                    <button
                      v-if="editingSessionId !== session.id"
                      class="btn-edit-session"
                      :title="$t('student.course.editTitle')"
                      @click="startEditSession(session)"
                    >
                      ✏️
                    </button>
                  </div>
                </div>

                <!-- View mode body -->
                <template v-if="editingSessionId !== session.id">
                  <p class="timeline-lecturer">
                    🎤 {{ session.lecturer || $t('student.course.noLecturerFull') }}
                  </p>
                  <p v-if="session.notes" class="timeline-notes">{{ session.notes }}</p>
                  <p v-else class="timeline-notes text-muted">
                    <em>{{ $t('student.course.noNotes') }}</em>
                  </p>
                </template>

                <!-- Edit mode (inline) -->
                <template v-else>
                  <div class="edit-session-form mt-2">
                    <div class="form-group mb-2">
                      <label class="form-label form-label-sm">{{
                        $t('student.course.editLecturer')
                      }}</label>
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
                      <label class="form-label form-label-sm"
                        >{{ $t('student.course.listenedTime') }}：</label
                      >
                      <input
                        v-model="editSessionDraft.listenedAt"
                        type="datetime-local"
                        class="form-input form-input-sm datetime-input"
                      />
                    </div>
                    <div class="form-group mb-2">
                      <label class="form-label form-label-sm"
                        >✍️ {{ $t('student.course.notes') }}：</label
                      >
                      <textarea
                        v-model="editSessionDraft.notes"
                        class="form-input form-input-sm text-area"
                        rows="3"
                        :placeholder="$t('student.course.notesPlaceholder')"
                      ></textarea>
                    </div>
                    <div class="edit-session-actions">
                      <button class="btn btn-primary btn-xs" @click="saveEditSession(session.id)">
                        💾 {{ $t('student.course.save') }}
                      </button>
                      <button class="btn btn-ghost btn-xs" @click="cancelEditSession">
                        {{ $t('student.course.cancel') }}
                      </button>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Collapsible review panel -->
        <div class="review-section mt-4">
          <button class="btn-review-toggle" @click="showReviewPanel = !showReviewPanel">
            <span>{{ showReviewPanel ? '▲' : '▼' }}</span>
            {{
              showReviewPanel
                ? $t('student.course.cancel')
                : '➕ ' + $t('student.course.recordSession')
            }}
          </button>

          <transition name="review-slide">
            <div v-if="showReviewPanel" class="review-form mt-3">
              <div class="form-group mb-3">
                <label class="form-label" for="review-lecturer-select">{{
                  $t('student.course.editLecturer')
                }}</label>
                <select id="review-lecturer-select" v-model="selectedLecturer" class="form-input">
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
                <label class="form-label" for="review-listened-time"
                  >{{ $t('student.course.listenedTime') }}：</label
                >
                <input
                  id="review-listened-time"
                  v-model="listenedAt"
                  type="datetime-local"
                  class="form-input datetime-input"
                />
              </div>

              <div class="form-group mb-3">
                <label class="form-label" for="review-notes-input"
                  >✍️ {{ $t('student.course.notes') }}：</label
                >
                <textarea
                  id="review-notes-input"
                  v-model="notesText"
                  class="form-input text-area"
                  :placeholder="$t('student.course.notesPlaceholder')"
                  rows="4"
                ></textarea>
              </div>

              <div class="save-row mt-3">
                <span v-if="saveStatus" class="save-status">{{ saveStatus }}</span>
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
            <label class="form-label" for="lecturer-select">{{
              $t('student.course.editLecturer')
            }}</label>
            <select id="lecturer-select" v-model="selectedLecturer" class="form-input">
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
            <label class="form-label" for="listened-time-input"
              >{{ $t('student.course.listenedTime') }}：</label
            >
            <input
              id="listened-time-input"
              v-model="listenedAt"
              type="datetime-local"
              class="form-input datetime-input"
            />
          </div>

          <label class="form-label" for="notes-input">✍️ {{ $t('student.course.notes') }}</label>
          <textarea
            id="notes-input"
            v-model="notesText"
            class="form-input text-area"
            :placeholder="$t('student.course.notesPlaceholder')"
            rows="5"
          ></textarea>

          <div class="save-row mt-4">
            <span v-if="saveStatus" class="save-status">{{ saveStatus }}</span>
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
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Course, ListenSession } from '@/stores/courses'
import { toLocalDateTimeInput } from '@/utils/datetime'
import { DEFAULT_CHURCH } from '@/types/auth'

// ── Props ─────────────────────────────────────────────────────────────────────

const props = defineProps<{
  selectedCourse: Course | null
}>()

// ── Stores ────────────────────────────────────────────────────────────────────

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const { t } = useI18n()
const { tDateTime } = useI18nHelper()

// ── Form State ────────────────────────────────────────────────────────────────

const selectedLecturer = ref('')
const notesText = ref('')
const listenedAt = ref(toLocalDateTimeInput())
const saveStatus = ref('')
const showReviewPanel = ref(false)

// Inline edit state
const editingSessionId = ref<string | null>(null)
const editSessionDraft = reactive({ lecturer: '', listenedAt: '', notes: '' })

// ── Reset form when course changes ────────────────────────────────────────────

watch(
  () => props.selectedCourse,
  () => {
    selectedLecturer.value = ''
    notesText.value = ''
    listenedAt.value = toLocalDateTimeInput()
    saveStatus.value = ''
    showReviewPanel.value = false
    editingSessionId.value = null
  }
)

// ── Computed ──────────────────────────────────────────────────────────────────

const currentRecord = computed(() => {
  if (!props.selectedCourse) return null
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentProgress(username, props.selectedCourse.id)
})

const availableLecturers = computed(() => {
  if (!props.selectedCourse) return []
  const courseId = props.selectedCourse.id
  const church = authStore.currentUser?.church || DEFAULT_CHURCH
  const churchLecturers = coursesStore.getLecturersByChurch(church)
  const list = churchLecturers.filter((l) => l.courseIds.includes(courseId))
  return list.length > 0 ? list : churchLecturers
})

// ── Actions ───────────────────────────────────────────────────────────────────

function saveNoteAndProgress() {
  if (!props.selectedCourse || !authStore.currentUser) return

  coursesStore.addListenSession(authStore.currentUser.username, props.selectedCourse.id, {
    lecturer: selectedLecturer.value,
    listenedAt: listenedAt.value,
    notes: notesText.value
  })

  saveStatus.value = '✓ ' + t('student.course.save')
  selectedLecturer.value = ''
  notesText.value = ''
  listenedAt.value = toLocalDateTimeInput()
  showReviewPanel.value = false
  setTimeout(() => {
    saveStatus.value = ''
  }, 3000)
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

<style scoped>
/* [css-migration] moved from StudentDashboard.vue */
/* Sticky Player Section */
.player-section {
  position: relative;
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
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 0.5rem;
}

.empty-emoji {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  animation: float-pulse 3s infinite ease-in-out;
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
  transition:
    background 0.2s,
    border-color 0.2s;
  text-align: left;
}

.btn-review-toggle:hover {
  background: rgba(99, 102, 241, 0.15);
  border-color: var(--primary, #6366f1);
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
  transition:
    opacity 0.15s,
    background 0.15s;
  line-height: 1;
}

.btn-edit-session:hover {
  opacity: 1;
  background: rgba(99, 102, 241, 0.12);
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
</style>

<style>
/*
 * Intentionally global: used by several components, element selectors / keyframes,
 * or rules whose look depends on cascade order against main.css and other global
 * styles (scoping would raise their specificity and change what wins).
 *
 * Every selector is guarded by :where(body:has(.student-dashboard)) so these rules only apply
 * while that page is on screen; otherwise they would keep applying to other pages
 * after the user switches account in the same tab. :where() adds no specificity.
 */
:where(body:has(.student-dashboard)) .sticky-panel {
  position: sticky;
  top: 96px;
  max-height: calc(100vh - 130px);
  overflow-y: auto;
  padding: 2rem;
  border-radius: var(--radius-lg);
  background: white;
}

:where(body:has(.student-dashboard)) .text-area {
  resize: vertical;
  border-radius: var(--radius-md);
  margin-top: 0.5rem;
}

:where(body:has(.student-dashboard)) .empty-player-state {
  padding: 4rem 2rem;
}

:where(body:has(.student-dashboard)) .empty-player-state h4 {
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

:where(body:has(.student-dashboard)) .datetime-input {
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}

/* Extra small button variant */
:where(body:has(.student-dashboard)) .btn-xs {
  font-size: 0.78rem;
  padding: 0.25rem 0.7rem;
  border-radius: 6px;
}
</style>

<style scoped>
/* Moved from the parent view, which applied it globally */

.empty-player-state .desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>
