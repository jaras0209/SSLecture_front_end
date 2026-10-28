<template>
  <section class="church-overview-panel glass-panel mt-4">
    <div class="main-header">
      <h3>{{ $t('admin.churchOverview.title') }}</h3>
      <span class="user-count-badge">{{
        $t('admin.churchOverview.count', { n: churchSummaries.length })
      }}</span>
    </div>
    <!-- Card Grid -->
    <div class="church-cards-grid mt-4">
      <div
        v-for="summary in churchSummaries"
        :key="summary.church"
        class="church-card"
        :class="{ 'church-card-expanded': expandedChurch === summary.church }"
      >
        <!-- Card Header -->
        <div class="church-card-header">
          <div class="church-card-icon">⛪</div>
          <div class="church-card-title-block">
            <h4 class="church-card-name">{{ summary.church }}</h4>
          </div>
        </div>

        <!-- Stats Row -->
        <div class="church-card-stats">
          <div class="church-stat-item">
            <span class="church-stat-val">{{ summary.teacherCount }}</span>
            <span class="church-stat-lbl">{{ $t('admin.churchOverview.teacherLbl') }}</span>
          </div>
          <div class="church-stat-divider"></div>
          <div class="church-stat-item">
            <span class="church-stat-val">{{ summary.studentCount }}</span>
            <span class="church-stat-lbl">{{ $t('admin.churchOverview.studentLbl') }}</span>
          </div>
        </div>

        <!-- View button -->
        <button
          class="church-card-btn"
          :class="{ active: expandedChurch === summary.church }"
          @click="toggleChurchExpand(summary.church)"
        >
          {{
            expandedChurch === summary.church
              ? $t('admin.churchOverview.collapse')
              : $t('admin.churchOverview.expand')
          }}
        </button>

        <!-- Expanded Detail -->
        <div v-if="expandedChurch === summary.church" class="church-card-detail">
          <!-- Teachers -->
          <div class="church-detail-section">
            <div class="church-detail-label">
              {{ $t('admin.churchOverview.teacherListLabel') }}
            </div>
            <div class="church-chips-row">
              <span
                v-for="tc in getChurchTeacherList(summary.church)"
                :key="tc"
                class="church-chip chip-teacher"
                :title="`@${tc}`"
                >✍️ {{ authStore.usersDb[tc]?.realName || tc }}</span
              >
              <span v-if="getChurchTeacherList(summary.church).length === 0" class="chip-empty">{{
                $t('admin.churchOverview.noTeachers')
              }}</span>
            </div>
          </div>
          <!-- Students -->
          <div class="church-detail-section mt-2">
            <div class="church-detail-label">
              {{ $t('admin.churchOverview.studentListLabel') }}
            </div>
            <div class="church-chips-row">
              <span
                v-for="std in getChurchStudentList(summary.church)"
                :key="std"
                class="church-chip chip-student"
                :title="`@${std}`"
                >🎒 {{ authStore.usersDb[std]?.realName || std }}</span
              >
              <span v-if="getChurchStudentList(summary.church).length === 0" class="chip-empty">{{
                $t('admin.churchOverview.noStudents')
              }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="churchSummaries.length === 0" class="church-empty-state">
        <div>🏛️</div>
        <p>{{ $t('admin.churchOverview.empty') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

const churchSummaries = computed(() => {
  return coursesStore.getChurchSummaries(authStore.usersDb)
})

const expandedChurch = ref<string | null>(null)

function toggleChurchExpand(church: string) {
  expandedChurch.value = expandedChurch.value === church ? null : church
}

function getChurchStudentList(church: string): string[] {
  return coursesStore.getStudentsByChurch(authStore.usersDb, church)
}

function getChurchTeacherList(church: string): string[] {
  return coursesStore.getTeachersByChurch(authStore.usersDb, church)
}
</script>

<style scoped src="./admin-shared.css"></style>

<style scoped>
/* Church Overview - Card Grid */
.church-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.church-card {
  border-radius: 14px;
  border: 1.5px solid #e2e8f0;
  background: white;
  overflow: hidden;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
  display: flex;
  flex-direction: column;
}

.church-card:hover {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border-color: #c7d2fe;
}

.church-card-expanded {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.church-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);
  border-bottom: 1px solid #e2e8f0;
}

.church-card-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.church-card-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
}

.church-card-stats {
  display: flex;
  align-items: center;
  padding: 0.85rem 1.25rem;
  gap: 0;
}

.church-stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.church-stat-val {
  font-size: 1.6rem;
  font-weight: 800;
  color: #6366f1;
  line-height: 1;
}

.church-stat-lbl {
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
  text-align: center;
}

.church-stat-divider {
  width: 1px;
  height: 36px;
  background: #e2e8f0;
  margin: 0 0.5rem;
}

.church-card-btn {
  width: 100%;
  padding: 0.6rem;
  border: none;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  color: #6366f1;
  cursor: pointer;
  transition: background 0.15s;
}

.church-card-btn:hover {
  background: #eef2ff;
}

.church-card-btn.active {
  background: #eef2ff;
  color: #4f46e5;
}

.church-card-detail {
  padding: 0.85rem 1.25rem 1rem;
  background: #fafbff;
  border-top: 1px dashed #e2e8f0;
}

.church-detail-section {
}
.church-detail-section.mt-2 {
  margin-top: 0.65rem;
}

.church-detail-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.church-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.church-chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.chip-teacher {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid #a7f3d0;
}

.chip-student {
  background: rgba(99, 102, 241, 0.08);
  color: #4f46e5;
  border: 1px solid #c7d2fe;
}

.chip-empty {
  font-size: 0.75rem;
  color: #94a3b8;
  font-style: italic;
}

.church-empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #94a3b8;
  font-size: 2rem;
}

.church-empty-state p {
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
</style>
