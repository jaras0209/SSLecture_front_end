<template>
  <section class="admin-stats-overview glass-panel mt-4">
    <div class="main-header">
      <h3>{{ $t('admin.statsOverview.title') }}</h3>
      <div class="stats-header-controls">
        <select v-model="adminStatsYear" class="form-input select-input" style="min-width: 120px">
          <option v-for="y in adminAvailableYears" :key="y" :value="y">
            {{ $t('admin.statsOverview.yearSuffix', { n: y }) }}
          </option>
        </select>
        <span class="user-count-badge">{{
          $t('admin.statsOverview.recordCount', { n: adminTeachingStats.length })
        }}</span>
      </div>
    </div>

    <div class="table-container mt-4">
      <table class="admin-table stats-table">
        <caption class="sr-only">
          {{
            $t('admin.statsOverview.tableCaption')
          }}
        </caption>
        <thead>
          <tr>
            <th>{{ $t('admin.statsOverview.colTeacher') }}</th>
            <th>{{ $t('admin.statsOverview.colChurch') }}</th>
            <th>{{ $t('admin.statsOverview.colLecturerDb') }}</th>
            <th>
              {{ $t('admin.statsOverview.col1on1Label') }}<br />{{
                $t('teacher.stats.sermonBlock')
              }}
            </th>
            <th>
              {{ $t('admin.statsOverview.col1manyLabel') }}<br />{{
                $t('teacher.stats.sermonBlock')
              }}
            </th>
            <th>
              {{ $t('admin.statsOverview.col1on1Label') }}<br />{{
                $t('teacher.stats.shiningBlock')
              }}
            </th>
            <th>
              {{ $t('admin.statsOverview.col1manyLabel') }}<br />{{
                $t('teacher.stats.shiningBlock')
              }}
            </th>
            <th>{{ $t('admin.statsOverview.colTotal') }}</th>
            <th>{{ $t('admin.statsOverview.colLastUpdate') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in adminTeachingStats" :key="row.teacherUsername">
            <td class="username-cell">
              <span class="avatar-dot avatar-teacher"></span>
              <div class="admin-name-col">
                <strong>{{
                  authStore.usersDb[row.teacherUsername]?.realName || row.teacherUsername
                }}</strong>
                <span v-if="authStore.usersDb[row.teacherUsername]?.realName" class="admin-id-tag">
                  @{{ row.teacherUsername }}
                </span>
              </div>
            </td>
            <td>
              <span class="admin-church-tag" style="font-size: 0.78rem">{{
                row.church || '—'
              }}</span>
            </td>
            <td class="text-center">
              <!-- Linked lecturer info -->
              <template v-if="getLinkedLecturer(row.teacherUsername)">
                <div class="linked-lec-cell">
                  <span class="linked-lec-name">{{
                    getLinkedLecturer(row.teacherUsername)?.name
                  }}</span>
                  <span class="lec-course-count">{{
                    $t('admin.statsOverview.courseSuffix', {
                      n: getLinkedLecturer(row.teacherUsername)?.courseIds.length
                    })
                  }}</span>
                </div>
              </template>
              <span v-else class="text-xs text-muted">{{
                $t('admin.statsOverview.noLecturerDb')
              }}</span>
            </td>
            <td class="text-center">
              <span class="stat-num">{{ row.oneOnOne30 }}</span>
            </td>
            <td class="text-center">
              <span class="stat-num">{{ row.oneToMany30 }}</span>
            </td>
            <td class="text-center">
              <span class="stat-num">{{ row.oneOnOneShining }}</span>
            </td>
            <td class="text-center">
              <span class="stat-num">{{ row.oneToManyShining }}</span>
            </td>
            <td class="text-center">
              <span class="badge badge-total">
                {{ row.oneOnOne30 + row.oneToMany30 + row.oneOnOneShining + row.oneToManyShining }}
              </span>
            </td>
            <td class="text-xs text-muted">{{ tDateTime(row.submittedAt) || '—' }}</td>
          </tr>
          <tr v-if="adminTeachingStats.length === 0">
            <td colspan="9" class="text-center empty-row">
              {{ $t('admin.statsOverview.emptyRow', { year: adminStatsYear }) }}
            </td>
          </tr>
          <!-- Grand Total Row -->
          <tr v-if="adminTeachingStats.length > 0" class="stats-grand-total-row">
            <td colspan="3">
              <strong>{{ $t('admin.statsOverview.grandTotal') }}</strong>
            </td>
            <td class="text-center">
              <strong>{{ adminStatsTotals.oneOnOne30 }}</strong>
            </td>
            <td class="text-center">
              <strong>{{ adminStatsTotals.oneToMany30 }}</strong>
            </td>
            <td class="text-center">
              <strong>{{ adminStatsTotals.oneOnOneShining }}</strong>
            </td>
            <td class="text-center">
              <strong>{{ adminStatsTotals.oneToManyShining }}</strong>
            </td>
            <td class="text-center">
              <span
                class="badge badge-total"
                style="background: var(--primary); color: white; font-size: 0.9rem"
              >
                {{ adminStatsTotals.total }}
              </span>
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'

const { tDateTime } = useI18nHelper()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()

const adminCurrentYear = new Date().getFullYear()
const adminAvailableYears = Array.from({ length: 5 }, (_, i) => adminCurrentYear - i)
const adminStatsYear = ref(adminCurrentYear)

const adminTeachingStats = computed(() => {
  return coursesStore.getAllTeachingStats(adminStatsYear.value).sort((a, b) => {
    // Sort by church, then teacher
    const churchDiff = (a.church || '').localeCompare(b.church || '', 'zh-TW')
    if (churchDiff !== 0) return churchDiff
    return a.teacherUsername.localeCompare(b.teacherUsername)
  })
})

const adminStatsTotals = computed(() => {
  const rows = adminTeachingStats.value
  return {
    oneOnOne30: rows.reduce((s, r) => s + r.oneOnOne30, 0),
    oneToMany30: rows.reduce((s, r) => s + r.oneToMany30, 0),
    oneOnOneShining: rows.reduce((s, r) => s + r.oneOnOneShining, 0),
    oneToManyShining: rows.reduce((s, r) => s + r.oneToManyShining, 0),
    total: rows.reduce(
      (s, r) => s + r.oneOnOne30 + r.oneToMany30 + r.oneOnOneShining + r.oneToManyShining,
      0
    )
  }
})

/**
 * 根據 teacherUsername 查找對應的講師資料庫紀錄
 * 用於統計總覽表顯示「講師資料庫」欄位
 */
function getLinkedLecturer(teacherUsername: string) {
  return coursesStore.getLecturerByUsername(teacherUsername)
}
</script>

<style scoped src="./admin-shared.css"></style>

<style scoped>
/* ─── Admin Teaching Stats Overview ─── */
.admin-stats-overview {
  padding: 2rem;
}

.stats-header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stats-table th {
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.3;
  white-space: nowrap;
}

.stats-table th:first-child,
.stats-table th:nth-child(2) {
  text-align: left;
}

.stat-num {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
}

.badge-total {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  font-weight: 700;
  font-size: 0.85rem;
}

.stats-grand-total-row td {
  background: rgba(99, 102, 241, 0.05);
  border-top: 2px solid rgba(99, 102, 241, 0.2);
  font-weight: 600;
}

/* Linked lecturer cell in admin stats table */
.linked-lec-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.linked-lec-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
}

.lec-course-count {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.empty-row {
  color: var(--text-muted);
  padding: 2rem;
  font-style: italic;
  font-size: 0.9rem;
}
</style>
