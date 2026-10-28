<template>
  <div class="dashboard-body no-print">
    <!-- Admin Church Selector -->
    <div v-if="isAdmin" class="glass-panel p-6 mb-4" style="padding: 1.75rem">
      <h4 class="mb-2">{{ $t('teacher.settings.churchSwitchTitle') }}</h4>
      <select
        v-model="adminSettingsChurch"
        class="form-input select-input"
        style="max-width: 300px"
      >
        <option v-for="c in CHURCHES" :key="c" :value="c">{{ c }}</option>
      </select>
      <p class="text-xs text-muted mt-2">{{ $t('teacher.settings.churchSwitchDesc') }}</p>
    </div>

    <!-- Section 1: Themes Management -->
    <section class="glass-panel p-6" style="padding: 1.75rem">
      <h3 class="mb-4">{{ $t('teacher.settings.themeEditorTitle') }}</h3>

      <!-- Character Themes -->
      <div class="theme-manage-block mb-4 pt-4">
        <h5>{{ $t('teacher.settings.characterThemesTitle') }}</h5>
        <ul class="theme-list mt-2">
          <li v-for="theme in characterThemes" :key="theme" class="theme-item">
            <span>✦ {{ theme }}</span>
            <div class="theme-item-actions">
              <button
                class="btn btn-secondary btn-sm"
                style="padding: 0.15rem 0.5rem; font-size: 0.75rem"
                @click="handleRenameTheme('character', theme)"
              >
                {{ $t('teacher.settings.rename') }}
              </button>
              <button
                class="btn btn-danger btn-sm"
                style="padding: 0.15rem 0.5rem; font-size: 0.75rem"
                @click="handleDeleteTheme('character', theme)"
              >
                {{ $t('teacher.settings.delete') }}
              </button>
            </div>
          </li>
        </ul>
        <div class="add-theme-row mt-2 flex gap-2">
          <input
            v-model="newCharacterTheme"
            type="text"
            class="form-input text-xs"
            :placeholder="$t('teacher.settings.characterPlaceholder')"
          />
          <button class="btn btn-primary btn-sm" @click="handleAddTheme('character')">
            {{ $t('teacher.settings.addTheme') }}
          </button>
        </div>
      </div>

      <!-- Coming of Age Themes -->
      <div class="theme-manage-block mb-4 pt-4 border-t">
        <h5>{{ $t('teacher.settings.comingOfAgeThemesTitle') }}</h5>
        <ul class="theme-list mt-2">
          <li v-for="theme in comingOfAgeThemes" :key="theme" class="theme-item">
            <span>✦ {{ theme }}</span>
            <div class="theme-item-actions">
              <button
                class="btn btn-secondary btn-sm"
                style="padding: 0.15rem 0.5rem; font-size: 0.75rem"
                @click="handleRenameTheme('comingOfAge', theme)"
              >
                {{ $t('teacher.settings.rename') }}
              </button>
              <button
                class="btn btn-danger btn-sm"
                style="padding: 0.15rem 0.5rem; font-size: 0.75rem"
                @click="handleDeleteTheme('comingOfAge', theme)"
              >
                {{ $t('teacher.settings.delete') }}
              </button>
            </div>
          </li>
        </ul>
        <div class="add-theme-row mt-2 flex gap-2">
          <input
            v-model="newComingOfAgeTheme"
            type="text"
            class="form-input text-xs"
            :placeholder="$t('teacher.settings.comingOfAgePlaceholder')"
          />
          <button class="btn btn-primary btn-sm" @click="handleAddTheme('comingOfAge')">
            {{ $t('teacher.settings.addTheme') }}
          </button>
        </div>
      </div>
    </section>

    <!-- Section 2: Lecturers Management -->
    <section class="glass-panel p-6" style="padding: 1.75rem">
      <div class="flex justify-between align-center mb-4">
        <h3 class="mb-0">{{ $t('teacher.settings.lecturerDbTitle') }}</h3>
        <button class="btn btn-primary btn-sm" @click="emit('open-add-lecturer')">
          {{ $t('teacher.settings.addLecturer') }}
        </button>
      </div>

      <div class="lecturers-grid mt-4">
        <div v-for="lec in filteredLecturers" :key="lec.id" class="lecturer-card glass-card">
          <div class="flex justify-between align-center">
            <div>
              <h5 style="margin: 0">
                <strong>{{ lec.name }}</strong>
                <span class="badge badge-teacher ml-2">{{ lec.title }}</span>
              </h5>
              <div class="lec-link-tags mt-1">
                <span v-if="lec.linkedUsername" class="lec-linked-badge">
                  🔗 @{{ lec.linkedUsername }}
                </span>
                <span v-else class="lec-custom-badge">
                  {{ $t('teacher.settings.externalLecturer') }}
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                class="btn btn-outline btn-sm"
                style="padding: 0.15rem 0.5rem; font-size: 0.75rem"
                @click="emit('open-edit-lecturer', lec)"
              >
                {{ $t('teacher.settings.editLecturer') }}
              </button>
              <button
                class="btn btn-danger btn-sm"
                style="padding: 0.15rem 0.5rem; font-size: 0.75rem"
                @click="handleDeleteLecturer(lec.id)"
              >
                {{ $t('teacher.settings.delete') }}
              </button>
            </div>
          </div>
          <div class="course-badges mt-2">
            <span class="text-xs text-muted block">{{
              $t('teacher.settings.assignedCourses', { n: lec.courseIds.length })
            }}</span>
            <div class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="cid in lec.courseIds"
                :key="cid"
                class="badge badge-student"
                style="font-size: 0.7rem"
              >
                {{ coursesStore.courses.find((c) => c.id === cid)?.title || cid }}
              </span>
              <span v-if="lec.courseIds.length === 0" class="text-xs text-muted italic">{{
                $t('teacher.settings.noCourses')
              }}</span>
            </div>
          </div>
        </div>
        <div v-if="filteredLecturers.length === 0" class="text-center text-muted py-8 italic">
          {{ $t('teacher.settings.noLecturers') }}
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { CHURCHES } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Lecturer } from '@/stores/courses'
import { useToast } from '@/composables/useToast'
import { DEFAULT_CHURCH } from '@/types/auth'

const { confirm } = useToast()
const { t } = useI18n()

const props = defineProps<{
  isAdmin: boolean
  currentContextChurch: string
}>()

const emit = defineEmits<{
  'open-add-lecturer': []
  'open-edit-lecturer': [lecturer: Lecturer]
}>()

const coursesStore = useCoursesStore()

// Admin church selector (only used when isAdmin is true)
const adminSettingsChurch = ref(props.currentContextChurch || DEFAULT_CHURCH)

const newCharacterTheme = ref('')
const newComingOfAgeTheme = ref('')

const characterThemes = computed(() =>
  coursesStore.getThemesByChurch('character', adminSettingsChurch.value)
)
const comingOfAgeThemes = computed(() =>
  coursesStore.getThemesByChurch('comingOfAge', adminSettingsChurch.value)
)

const filteredLecturers = computed(() =>
  coursesStore.getLecturersByChurch(adminSettingsChurch.value)
)

function handleAddTheme(type: 'character' | 'comingOfAge') {
  const value =
    type === 'character' ? newCharacterTheme.value.trim() : newComingOfAgeTheme.value.trim()
  if (!value) return
  coursesStore.addTheme(type, value, adminSettingsChurch.value)
  if (type === 'character') newCharacterTheme.value = ''
  else newComingOfAgeTheme.value = ''
}

function handleRenameTheme(type: 'character' | 'comingOfAge', theme: string) {
  // Note: rename via prompt is now a no-op; use inline edit in future iteration
  const newName = window.prompt(t('teacher.settings.renamePhraseTitle', { theme }), theme)
  if (newName && newName.trim() && newName.trim() !== theme) {
    coursesStore.updateTheme(type, theme, newName.trim(), adminSettingsChurch.value)
  }
}

async function handleDeleteTheme(type: 'character' | 'comingOfAge', theme: string) {
  const ok = await confirm(t('teacher.settings.deleteThemeConfirm', { theme }))
  if (ok) {
    coursesStore.deleteTheme(type, theme, adminSettingsChurch.value)
  }
}

async function handleDeleteLecturer(id: string) {
  const ok = await confirm(t('teacher.settings.deleteLecturerConfirm'))
  if (ok) {
    coursesStore.deleteLecturer(id)
  }
}
</script>

<style>
/* [css-migration] moved from TeacherDashboard.vue */
.theme-list {
  list-style: none;
  padding: 0;
  margin: 0;
  max-height: 220px;
  overflow-y: auto;
}

.theme-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: #f8fafc;
  border-radius: 6px;
  margin-bottom: 0.35rem;
  border: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.theme-item-actions {
  display: flex;
  gap: 0.25rem;
}

.lecturers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  max-height: 500px;
  overflow-y: auto;
}

.lecturer-card {
  background: white;
  border-radius: var(--radius-sm);
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  box-shadow: var(--shadow-sm);
}

/* Lecturer card link badges */
.lec-link-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.lec-linked-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.lec-custom-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 1px 8px;
  border-radius: 20px;
  background: rgba(245, 158, 11, 0.1);
  color: #d97706;
  border: 1px solid rgba(245, 158, 11, 0.25);
}
</style>
