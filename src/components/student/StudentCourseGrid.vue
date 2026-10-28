<template>
  <!-- Course Section -->
  <section class="courses-section">
    <div class="section-title-row">
      <h3>📖 {{ $t('profile.student.courseTitle') }}</h3>
      <div class="filter-tabs">
        <button
          v-for="tab in filterTabs"
          :key="tab"
          :class="['filter-btn', { active: currentFilter === tab }]"
          @click="currentFilter = tab"
        >
          {{
            tab === 'all'
              ? $t('profile.course.all')
              : tab === 'bible'
                ? $t('profile.course.bible')
                : $t('profile.course.topic')
          }}
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
          <span class="category-badge">{{
            course.category === 'bible'
              ? $t('profile.course.bibleBadge')
              : $t('profile.course.topicBadge')
          }}</span>
          <span v-if="getRecord(course.id).completed" class="completed-check"
            >✓ {{ $t('student.motivation.done') }}</span
          >
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
                {{ $t('student.course.listenCount', { n: getRecord(course.id).sessions.length }) }}
              </template>
              <template v-else>
                {{ $t('student.course.notRegistered') }}
              </template>
            </span>
            <!-- Show latest session lecturer -->
            <span
              v-if="getRecord(course.id).sessions.length > 0"
              class="lecturer-tag text-xs text-muted mt-1"
              style="display: block"
            >
              🎤 {{ $t('student.course.lecturerLabel') }}：{{
                getRecord(course.id).sessions[getRecord(course.id).sessions.length - 1].lecturer ||
                $t('student.course.noLecturer')
              }}
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
  return coursesStore.courses.filter((c) => c.category === currentFilter.value)
})

// ── Record Access ─────────────────────────────────────────────────────────────

function getRecord(courseId: string) {
  const username = authStore.currentUser?.username || ''
  return coursesStore.getStudentProgress(username, courseId)
}
</script>

<style>
/* [css-migration] moved from StudentDashboard.vue */
.section-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter-tabs {
  display: flex;
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  padding: 0.2rem;
  border-radius: var(--radius-full);
}

/* Course Grid and Cards */
.courses-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.course-card {
  display: flex;
  overflow: hidden;
  cursor: pointer;
  transition: all var(--transition-normal);
}

.course-card:hover {
  transform: translateY(-3px);
}

.card-cover {
  width: 160px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.category-badge {
  position: absolute;
  top: 0.75rem;
  left: 0.75rem;
  background: rgba(0, 0, 0, 0.35);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  backdrop-filter: blur(4px);
}

.completed-check {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  background: var(--secondary);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  box-shadow: var(--shadow-sm);
}

.card-content {
  padding: 1.25rem;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.course-title {
  font-size: 1.15rem;
  color: var(--text-primary);
  margin-bottom: 0.25rem;
}

.course-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@media (max-width: 640px) {
  /* Course card: vertical on mobile */
  .course-card {
    flex-direction: column;
  }

  .card-cover {
    width: 100%;
    height: 140px;
  }

  .card-content {
    padding: 0.85rem;
  }

  .course-title {
    font-size: 1rem;
  }

  /* Filter tabs: horizontal scroll */
  .filter-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    max-width: 100%;
  }
}

/* ── Card selected state ── */
.course-card.card-selected {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
</style>
