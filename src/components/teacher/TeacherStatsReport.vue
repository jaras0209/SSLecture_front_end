<template>
  <section
    class="glass-panel stats-report-panel"
    v-if="authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin'"
  >
    <div class="stats-report-header">
      <div>
        <h3>{{ $t('teacher.stats.panelTitle') }}</h3>
        <p class="section-desc text-sm text-muted mt-1">{{ $t('teacher.stats.panelDesc') }}</p>
      </div>
      <select v-model="statsYear" class="form-input select-input stats-year-select">
        <option v-for="y in availableYears" :key="y" :value="y">{{ $t('teacher.stats.yearSuffix', { n: y }) }}</option>
      </select>
    </div>

    <div class="stats-form-grid mt-4">
      <!-- 三十個論 block -->
      <div class="stats-group-card">
        <div class="stats-group-title">{{ $t('teacher.stats.sermonBlock') }}</div>
        <p class="stats-group-desc text-xs text-muted mb-3">{{ $t('teacher.stats.sermonDesc') }}</p>
        <div class="stats-fields">
          <div class="stats-field-item">
            <label class="form-label">
              {{ $t('teacher.stats.oneOnOne') }}
              <span class="stats-badge">{{ $t('teacher.stats.oneOnOneBadge') }}</span>
            </label>
            <div class="stats-input-row">
              <input
                v-model.number="statsForm.oneOnOne30"
                type="number" min="0"
                class="form-input stats-number-input"
                placeholder="0"
                id="stat-one-on-one-30"
              />
              <span class="stats-unit">{{ $t('teacher.stats.unit') }}</span>
            </div>
          </div>
          <div class="stats-field-item">
            <label class="form-label">
              {{ $t('teacher.stats.oneToMany') }}
              <span class="stats-badge stats-badge-multi">{{ $t('teacher.stats.oneToManyBadge') }}</span>
            </label>
            <div class="stats-input-row">
              <input
                v-model.number="statsForm.oneToMany30"
                type="number" min="0"
                class="form-input stats-number-input"
                placeholder="0"
                id="stat-one-to-many-30"
              />
              <span class="stats-unit">{{ $t('teacher.stats.unit') }}</span>
            </div>
          </div>
        </div>
        <div class="stats-subtotal">
          {{ $t('teacher.stats.subtotal') }}<strong>{{ (statsForm.oneOnOne30 || 0) + (statsForm.oneToMany30 || 0) }}</strong> {{ $t('teacher.stats.unit') }}
        </div>
      </div>

      <!-- 閃耀計畫課程 block -->
      <div class="stats-group-card">
        <div class="stats-group-title">{{ $t('teacher.stats.shiningBlock') }}</div>
        <p class="stats-group-desc text-xs text-muted mb-3">{{ $t('teacher.stats.shiningDesc') }}</p>
        <div class="stats-fields">
          <div class="stats-field-item">
            <label class="form-label">
              {{ $t('teacher.stats.oneOnOne') }}
              <span class="stats-badge">{{ $t('teacher.stats.oneOnOneBadge') }}</span>
            </label>
            <div class="stats-input-row">
              <input
                v-model.number="statsForm.oneOnOneShining"
                type="number" min="0"
                class="form-input stats-number-input"
                placeholder="0"
                id="stat-one-on-one-shining"
              />
              <span class="stats-unit">{{ $t('teacher.stats.unit') }}</span>
            </div>
          </div>
          <div class="stats-field-item">
            <label class="form-label">
              {{ $t('teacher.stats.oneToMany') }}
              <span class="stats-badge stats-badge-multi">{{ $t('teacher.stats.oneToManyBadge') }}</span>
            </label>
            <div class="stats-input-row">
              <input
                v-model.number="statsForm.oneToManyShining"
                type="number" min="0"
                class="form-input stats-number-input"
                placeholder="0"
                id="stat-one-to-many-shining"
              />
              <span class="stats-unit">{{ $t('teacher.stats.unit') }}</span>
            </div>
          </div>
        </div>
        <div class="stats-subtotal">
          {{ $t('teacher.stats.subtotal') }}<strong>{{ (statsForm.oneOnOneShining || 0) + (statsForm.oneToManyShining || 0) }}</strong> {{ $t('teacher.stats.unit') }}
        </div>
      </div>
    </div>

    <!-- Total summary -->
    <div class="stats-total-row mt-4">
      <span>{{ $t('teacher.stats.grandTotal', { year: statsYear }) }}</span>
      <span class="stats-total-num">
        {{ (statsForm.oneOnOne30 || 0) + (statsForm.oneToMany30 || 0) + (statsForm.oneOnOneShining || 0) + (statsForm.oneToManyShining || 0) }}
        {{ $t('teacher.stats.unit') }}
      </span>
    </div>

    <div class="stats-action-row mt-4">
      <span v-if="statsSavedMsg" class="stats-saved-msg">{{ statsSavedMsg }}</span>
      <button class="btn btn-primary" @click="handleSaveStats" id="btn-save-stats">
        {{ $t('teacher.stats.saveBtn', { year: statsYear }) }}
      </button>
    </div>
    <p v-if="statsLastSubmit" class="stats-last-submit text-xs text-muted mt-2">
      {{ $t('teacher.stats.lastUpdated') }}{{ statsLastSubmit }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'

const { t } = useI18n()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()

const currentYear = new Date().getFullYear()
const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i)
const statsYear = ref(currentYear)

const statsForm = ref({
  oneOnOne30: 0,
  oneToMany30: 0,
  oneOnOneShining: 0,
  oneToManyShining: 0
})

const statsSavedMsg = ref('')
const statsLastSubmit = ref('')

function loadStatsForYear(year: number) {
  const username = authStore.currentUser?.username
  if (!username) return
  const existing = coursesStore.getTeachingStats(username, year)
  statsForm.value = {
    oneOnOne30: existing.oneOnOne30,
    oneToMany30: existing.oneToMany30,
    oneOnOneShining: existing.oneOnOneShining,
    oneToManyShining: existing.oneToManyShining
  }
  statsLastSubmit.value = existing.submittedAt || ''
}

watch(statsYear, (y) => {
  loadStatsForYear(y)
  statsSavedMsg.value = ''
})

// Load on mount
loadStatsForYear(currentYear)

function handleSaveStats() {
  const username = authStore.currentUser?.username
  const church = authStore.currentUser?.church || ''
  if (!username) return
  coursesStore.saveTeachingStats(username, statsYear.value, church, {
    oneOnOne30: statsForm.value.oneOnOne30 || 0,
    oneToMany30: statsForm.value.oneToMany30 || 0,
    oneOnOneShining: statsForm.value.oneOnOneShining || 0,
    oneToManyShining: statsForm.value.oneToManyShining || 0
  })
  statsLastSubmit.value = new Date().toLocaleString('zh-TW', { hour12: false })
  statsSavedMsg.value = t('teacher.stats.savedMsg')
  setTimeout(() => { statsSavedMsg.value = '' }, 3000)
}
</script>

<style>
/* [css-migration] moved from TeacherDashboard.vue */
@media (max-width: 480px) {
  /* Stats form */
  .stats-form-grid {
      grid-template-columns: 1fr;
    }
}

/* Pastor Overview Grid */
/* ?????? Annual Teaching Stats Report Panel ?????? */
.stats-report-panel {
  padding: 2rem;
  margin-top: 1.5rem;
}

.stats-report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.stats-year-select {
  min-width: 120px;
  flex-shrink: 0;
}

.stats-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

@media (max-width: 768px) {
  .stats-form-grid {
      grid-template-columns: 1fr;
    }
}

.stats-group-card {
  background: rgba(99, 102, 241, 0.04);
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  padding: 1.25rem;
}

.stats-group-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.stats-group-desc {
  line-height: 1.5;
}

.stats-fields {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.stats-badge {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 600;
  padding: 1px 7px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.stats-badge-multi {
  background: rgba(245, 158, 11, 0.1);
  color: #D97706;
  border-color: rgba(245, 158, 11, 0.2);
}

.stats-input-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stats-number-input {
  width: 90px !important;
  text-align: center;
  font-weight: 700;
  font-size: 1.1rem;
}

.stats-unit {
  font-size: 0.82rem;
  color: var(--text-muted);
  font-weight: 500;
}

.stats-subtotal {
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid rgba(99, 102, 241, 0.1);
  font-size: 0.82rem;
  color: var(--text-secondary);
  text-align: right;
}

.stats-subtotal strong {
  color: var(--primary);
  font-size: 1rem;
}

.stats-total-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.08) 100%);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 10px;
  padding: 0.85rem 1.25rem;
  font-weight: 600;
}

.stats-total-num {
  font-size: 1.5rem;
  font-weight: 800;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.stats-action-row {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

.stats-saved-msg {
  font-size: 0.85rem;
  color: #10B981;
  font-weight: 600;
}

.stats-last-submit {
  text-align: right;
}
</style>
