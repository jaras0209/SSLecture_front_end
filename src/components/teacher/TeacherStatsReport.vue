<template>
  <section
    class="glass-panel stats-report-panel"
    v-if="authStore.currentUser?.role === 'teacher' || authStore.currentUser?.role === 'admin'"
  >
    <div class="stats-report-header">
      <div>
        <h3>📊 年度教學人次申報</h3>
        <p class="section-desc text-sm text-muted mt-1">
          每年度結束後，請填寫您該年度的講義教學人次。<br/>
          一次對多人講義，依「人次」計算（如一次對3人 = 3人次）。
        </p>
      </div>
      <select v-model="statsYear" class="form-input select-input stats-year-select">
        <option v-for="y in availableYears" :key="y" :value="y">{{ y }} 年度</option>
      </select>
    </div>

    <div class="stats-form-grid mt-4">
      <!-- 三十個論 block -->
      <div class="stats-group-card">
        <div class="stats-group-title">📖 三十個論</div>
        <p class="stats-group-desc text-xs text-muted mb-3">
          聖經與講義課程（bible / lecture 分類的所有課堂）
        </p>
        <div class="stats-fields">
          <div class="stats-field-item">
            <label class="form-label">
              1對1 講義人次
              <span class="stats-badge">一位教師 × 一位學員</span>
            </label>
            <div class="stats-input-row">
              <input
                v-model.number="statsForm.oneOnOne30"
                type="number" min="0"
                class="form-input stats-number-input"
                placeholder="0"
                id="stat-one-on-one-30"
              />
              <span class="stats-unit">人次</span>
            </div>
          </div>
          <div class="stats-field-item">
            <label class="form-label">
              1對多 講義人次
              <span class="stats-badge stats-badge-multi">一次對3人 = 3人次</span>
            </label>
            <div class="stats-input-row">
              <input
                v-model.number="statsForm.oneToMany30"
                type="number" min="0"
                class="form-input stats-number-input"
                placeholder="0"
                id="stat-one-to-many-30"
              />
              <span class="stats-unit">人次</span>
            </div>
          </div>
        </div>
        <div class="stats-subtotal">
          小計：<strong>{{ (statsForm.oneOnOne30 || 0) + (statsForm.oneToMany30 || 0) }}</strong> 人次
        </div>
      </div>

      <!-- 閃耀計畫課程 block -->
      <div class="stats-group-card">
        <div class="stats-group-title">✨ 閃耀計畫課程</div>
        <p class="stats-group-desc text-xs text-muted mb-3">
          品格力課程、基督教歷史、情感教育、老師的使命與精神等
        </p>
        <div class="stats-fields">
          <div class="stats-field-item">
            <label class="form-label">
              1對1 講義人次
              <span class="stats-badge">一位教師 × 一位學員</span>
            </label>
            <div class="stats-input-row">
              <input
                v-model.number="statsForm.oneOnOneShining"
                type="number" min="0"
                class="form-input stats-number-input"
                placeholder="0"
                id="stat-one-on-one-shining"
              />
              <span class="stats-unit">人次</span>
            </div>
          </div>
          <div class="stats-field-item">
            <label class="form-label">
              1對多 講義人次
              <span class="stats-badge stats-badge-multi">一次對3人 = 3人次</span>
            </label>
            <div class="stats-input-row">
              <input
                v-model.number="statsForm.oneToManyShining"
                type="number" min="0"
                class="form-input stats-number-input"
                placeholder="0"
                id="stat-one-to-many-shining"
              />
              <span class="stats-unit">人次</span>
            </div>
          </div>
        </div>
        <div class="stats-subtotal">
          小計：<strong>{{ (statsForm.oneOnOneShining || 0) + (statsForm.oneToManyShining || 0) }}</strong> 人次
        </div>
      </div>
    </div>

    <!-- Total summary -->
    <div class="stats-total-row mt-4">
      <span>{{ statsYear }} 年度合計教學人次</span>
      <span class="stats-total-num">
        {{ (statsForm.oneOnOne30 || 0) + (statsForm.oneToMany30 || 0) + (statsForm.oneOnOneShining || 0) + (statsForm.oneToManyShining || 0) }}
        人次
      </span>
    </div>

    <div class="stats-action-row mt-4">
      <span v-if="statsSavedMsg" class="stats-saved-msg">{{ statsSavedMsg }}</span>
      <button class="btn btn-primary" @click="handleSaveStats" id="btn-save-stats">
        💾 儲存 {{ statsYear }} 年度申報
      </button>
    </div>
    <p v-if="statsLastSubmit" class="stats-last-submit text-xs text-muted mt-2">
      最後更新：{{ statsLastSubmit }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'

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
  statsSavedMsg.value = '✅ 已儲存！'
  setTimeout(() => { statsSavedMsg.value = '' }, 3000)
}
</script>
