<template>
  <!-- Course Section -->
  <section class="courses-section">
    <div class="section-title-row">
      <h3>📖 課程與講座清單</h3>
      <div class="filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab"
          :class="['filter-btn', { active: currentFilter === tab }]"
          @click="currentFilter = tab"
        >
          {{ tab === 'all' ? '全部項目' : tab === 'bible' ? '聖經課程' : '專題講座' }}
        </button>
      </div>
    </div>

    <div class="courses-grid">
      <div
        v-for="course in filteredCourses"
        :key="course.id"
        class="course-card glass-panel"
        :class="{ 'card-selected': selectedCourseId === course.id }"
        @click="emit('select-course', course)"
      >
        <div class="card-cover" :style="{ background: course.coverColor }">
          <span class="category-badge">{{ course.category === 'bible' ? '聖經' : '講座' }}</span>
          <span v-if="getRecord(course.id).completed" class="completed-check">✓ 已完成</span>
        </div>
        <div class="card-content">
          <h4 class="course-title">{{ course.title }}</h4>
          <p class="course-desc">{{ course.description }}</p>

          <!-- Status info on card -->
          <div class="card-status-info mt-2">
            <!-- Listen count badge -->
            <span
              class="badge"
              :class="getRecord(course.id).completed ? 'badge-teacher' : 'badge-student'"
            >
              <template v-if="getRecord(course.id).sessions.length > 0">
                🎧 已聽 {{ getRecord(course.id).sessions.length }} 次
              </template>
              <template v-else>
                📝 尚未登記
              </template>
            </span>
            <!-- Show latest session lecturer -->
            <span
              class="lecturer-tag text-xs text-muted mt-1"
              v-if="getRecord(course.id).sessions.length > 0"
              style="display: block;"
            >
              🎤 講師：{{ getRecord(course.id).sessions[getRecord(course.id).sessions.length - 1].lecturer || '未填寫' }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Course } from '@/stores/courses'

// ── Props & Emits ─────────────────────────────────────────────────────────────

defineProps<{
  selectedCourseId?: string | null
}>()

const emit = defineEmits<{
  'select-course': [course: Course]
}>()

// ── Stores ────────────────────────────────────────────────────────────────────

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

// ── Filter State ──────────────────────────────────────────────────────────────

const currentFilter = ref<'all' | 'bible' | 'lecture'>('all')
const filterTabs = ['all', 'bible', 'lecture'] as const

// ── Course Data ───────────────────────────────────────────────────────────────

const filteredCourses = computed(() => {
  if (currentFilter.value === 'all') return coursesStore.courses
  return coursesStore.courses.filter(c => c.category === currentFilter.value)
})

// ── Record Access ─────────────────────────────────────────────────────────────

function getRecord(courseId: string) {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentProgress(username, courseId)
}
</script>
