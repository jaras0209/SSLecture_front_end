<template>
  <Teleport to="body">
    <Transition name="notes-dialog-fade">
      <div
        v-if="modelValue && student"
        class="notes-dialog-overlay"
        @click.self="close"
      >
        <div class="notes-dialog-card">
          <!-- Dialog Header -->
          <div class="notes-dialog-header">
            <div class="notes-dialog-profile">
              <img :src="student.avatarUrl" class="avatar-md" alt="Avatar" />
              <div>
                <h3>
                  {{ student.realName || student.username }} 的心得與筆記
                  <span v-if="student.realName" class="student-id-tag-sm">@{{ student.username }}</span>
                </h3>
                <p class="notes-dialog-subtitle">
                  總完成 {{ student.completedCount }} / {{ totalCourses }} 堂課 · {{ student.totalProgressPercent }}%
                </p>
              </div>
            </div>
            <button class="notes-close-btn" aria-label="關閉" @click="close">×</button>
          </div>

          <!-- Filter Bar -->
          <div class="notes-filter-bar">
            <span class="filter-label">🔍 篩選顯示：</span>
            <div class="filter-btns">
              <button
                :class="['filter-btn', { active: notesFilter === 'all' }]"
                @click="notesFilter = 'all'"
              >
                📚 全部 ({{ student.records.length }})
              </button>
              <button
                :class="['filter-btn', { active: notesFilter === 'completed' }]"
                @click="notesFilter = 'completed'"
              >
                ✅ 已完成 ({{ student.records.filter(r => r.completed).length }})
              </button>
              <button
                :class="['filter-btn', { active: notesFilter === 'incomplete' }]"
                @click="notesFilter = 'incomplete'"
              >
                ⏳ 未完成 ({{ student.records.filter(r => !r.completed).length }})
              </button>
              <button
                :class="['filter-btn', { active: notesFilter === 'has-notes' }]"
                @click="notesFilter = 'has-notes'"
              >
                📝 已有心得 ({{ student.records.filter(r => r.notes && r.notes.trim()).length }})
              </button>
            </div>
          </div>

          <!-- Records List -->
          <div class="notes-dialog-body">
            <div v-if="filteredRecords.length === 0" class="notes-empty-state">
              <div class="notes-empty-icon">💭</div>
              <p>目前沒有符合條件的紀錄</p>
            </div>
            <div
              v-for="record in filteredRecords"
              :key="record.courseId"
              class="notes-record-card"
              :class="{
                'notes-record-completed': record.completed,
                'notes-record-incomplete': !record.completed
              }"
            >
              <!-- Card Header -->
              <div class="notes-record-header">
                <div class="notes-record-title-row">
                  <span class="notes-record-index">📖</span>
                  <h5 class="notes-record-title">{{ record.courseTitle }}</h5>
                </div>
                <span :class="['notes-status-badge', record.completed ? 'status-done' : 'status-pending']">
                  {{ record.completed ? '✅ 已聽完' : '⏳ 聽講中' }}
                </span>
              </div>

              <!-- Meta Info -->
              <div class="notes-record-meta">
                <span class="meta-chip">🎤 {{ record.lecturer || '未指定講師' }}</span>
                <span class="meta-chip" v-if="record.listenedAt">📅 {{ formatDateTime(record.listenedAt) }}</span>
                <span class="meta-chip" v-if="record.lastUpdated">📥 提交：{{ record.lastUpdated }}</span>
              </div>

              <!-- Notes Content -->
              <div class="notes-record-content">
                <div v-if="record.notes && record.notes.trim()" class="notes-text-box">
                  <div class="notes-text-header">📝 學員心得日誌</div>
                  <div class="notes-text-body">{{ record.notes }}</div>
                </div>
                <div v-else class="notes-empty-note">
                  <span>🌟 學員尚未填寫心得筆記</span>
                </div>
              </div>

              <!-- Feedback Area (teacher/admin/pastor only) -->
              <div
                class="notes-feedback-area"
                v-if="record.notes && canSendFeedback"
              >
                <label class="feedback-label">💬 回覆給學員</label>
                <div class="feedback-input-row">
                  <input
                    v-model="feedbackInputs[student.username + '_' + record.courseId]"
                    type="text"
                    class="form-input"
                    placeholder="寫下鼓勵話語、心得回应..."
                  />
                  <button
                    class="btn btn-primary btn-sm"
                    @click="onSendFeedback(student.username, record.courseId)"
                  >傳送</button>
                </div>
                <p
                  v-if="feedbacksSent[student.username + '_' + record.courseId]"
                  class="feedback-sent-msg"
                >
                  {{ feedbacksSent[student.username + '_' + record.courseId] }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

export interface StudentRecordDetail {
  courseTitle: string
  courseId: string
  listenedTime: number
  totalDuration: number
  percent: number
  completed: boolean
  notes: string
  lastUpdated: string
  listenedAt?: string
  lecturer?: string
}

export interface StudentProgressSummary {
  username: string
  realName?: string
  avatarUrl: string
  completedCount: number
  totalProgressPercent: number
  lastActive: string
  records: StudentRecordDetail[]
}

const props = defineProps<{
  modelValue: boolean
  student: StudentProgressSummary | null
  totalCourses: number
  /** Whether the current user can send feedback (teacher/admin/pastor only) */
  canSendFeedback?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'feedback-sent': [username: string, courseId: string, message: string]
}>()

// Internal state
const notesFilter = ref<'all' | 'completed' | 'incomplete' | 'has-notes'>('all')
const feedbackInputs = ref<Record<string, string>>({})
const feedbacksSent = ref<Record<string, string>>({})

function close() {
  emit('update:modelValue', false)
}

const filteredRecords = computed(() => {
  if (!props.student) return []
  const records = props.student.records
  if (notesFilter.value === 'all') return records
  if (notesFilter.value === 'completed') return records.filter(r => r.completed)
  if (notesFilter.value === 'incomplete') return records.filter(r => !r.completed)
  if (notesFilter.value === 'has-notes') return records.filter(r => r.notes && r.notes.trim())
  return records
})

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function onSendFeedback(username: string, courseId: string) {
  const key = `${username}_${courseId}`
  const msg = feedbackInputs.value[key]?.trim()
  if (!msg) return
  feedbacksSent.value[key] = `✅ 已傳送：「${msg}」`
  emit('feedback-sent', username, courseId, msg)
  feedbackInputs.value[key] = ''
}
</script>

<style scoped>
/* ===================== Notes Dialog ===================== */
.notes-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  padding: 1rem;
}

.notes-dialog-card {
  width: 100%;
  max-width: 840px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 32px 96px rgba(0, 0, 0, 0.28);
  overflow: hidden;
}

.notes-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #E2E8F0;
  background: linear-gradient(135deg, #F8FAFC 0%, #EEF2FF 100%);
  flex-shrink: 0;
}

.notes-dialog-profile {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.notes-dialog-profile h3 {
  margin: 0 0 0.25rem 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #1e293b;
}

.notes-dialog-subtitle {
  margin: 0;
  font-size: 0.82rem;
  color: #64748B;
}

.notes-close-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: rgba(0,0,0,0.06);
  border-radius: 50%;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #475569;
  transition: background 0.15s;
  flex-shrink: 0;
}

.notes-close-btn:hover {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}

/* Filter Bar */
.notes-filter-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.85rem 2rem;
  background: #F8FAFC;
  border-bottom: 1px solid #E2E8F0;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.filter-label {
  font-size: 0.82rem;
  font-weight: 700;
  color: #64748B;
  white-space: nowrap;
}

.filter-btns {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.35rem 0.9rem;
  border: 2px solid #E2E8F0;
  border-radius: 999px;
  background: white;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748B;
  cursor: pointer;
  transition: all 0.15s ease;
  line-height: 1.5;
}

.filter-btn:hover {
  border-color: #6366F1;
  color: #6366F1;
  background: #EEF2FF;
}

.filter-btn.active {
  background: #6366F1;
  border-color: #6366F1;
  color: white;
  box-shadow: 0 3px 10px rgba(99, 102, 241, 0.3);
}

/* Dialog Body */
.notes-dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 1.25rem 1.75rem;
  display: block;
  background: #F1F5F9;
}

.notes-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #94A3B8;
  gap: 0.5rem;
}

.notes-empty-icon {
  font-size: 2.5rem;
  opacity: 0.5;
}

/* Individual record card */
.notes-record-card {
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #E2E8F0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: box-shadow 0.2s ease;
  flex-shrink: 0;
  margin-bottom: 0.85rem;
}

.notes-record-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.notes-record-completed { border-left: 4px solid #10B981; }
.notes-record-incomplete { border-left: 4px solid #F59E0B; }

.notes-record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.85rem 1.25rem;
  background: #FAFBFC;
  border-bottom: 1px solid #F0F2F5;
}

.notes-record-title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  flex: 1;
}

.notes-record-index { font-size: 1rem; flex-shrink: 0; }

.notes-record-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notes-status-badge {
  padding: 0.2rem 0.7rem;
  border-radius: 999px;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: 0.75rem;
}

.status-done { background: rgba(16, 185, 129, 0.1); color: #059669; }
.status-pending { background: rgba(245, 158, 11, 0.1); color: #D97706; }

.notes-record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.55rem 1.25rem;
  background: white;
  border-bottom: 1px dashed #EAECF0;
}

.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.75rem;
  color: #64748B;
  background: #F1F5F9;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  border: 1px solid #E2E8F0;
}

.notes-record-content { padding: 0.85rem 1.25rem; background: white; }

.notes-text-box {
  background: #F0FDF4;
  border: 1px solid #BBF7D0;
  border-radius: 8px;
  overflow: hidden;
}

.notes-text-header {
  font-size: 0.73rem;
  font-weight: 700;
  color: #16A34A;
  padding: 0.35rem 0.8rem;
  background: rgba(22, 163, 74, 0.07);
  border-bottom: 1px solid #BBF7D0;
}

.notes-text-body {
  padding: 0.7rem 0.8rem;
  font-size: 0.88rem;
  line-height: 1.75;
  color: #1e293b;
  white-space: pre-wrap;
  word-break: break-word;
}

.notes-empty-note {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.65rem;
  background: #F8FAFC;
  border-radius: 8px;
  font-size: 0.83rem;
  color: #94A3B8;
  font-style: italic;
  border: 1px dashed #E2E8F0;
}

/* Feedback */
.notes-feedback-area {
  padding: 0.8rem 1.25rem;
  border-top: 1px dashed #E2E8F0;
  background: #FFFBEB;
}

.feedback-label {
  display: block;
  font-size: 0.76rem;
  font-weight: 700;
  color: #92400E;
  margin-bottom: 0.45rem;
}

.feedback-input-row { display: flex; gap: 0.5rem; }

.feedback-sent-msg {
  font-size: 0.77rem;
  color: #16A34A;
  margin-top: 0.4rem;
  font-weight: 600;
}

/* Transition */
.notes-dialog-fade-enter-active,
.notes-dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}
.notes-dialog-fade-enter-active .notes-dialog-card,
.notes-dialog-fade-leave-active .notes-dialog-card {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.notes-dialog-fade-enter-from,
.notes-dialog-fade-leave-to {
  opacity: 0;
}
.notes-dialog-fade-enter-from .notes-dialog-card {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}
</style>
