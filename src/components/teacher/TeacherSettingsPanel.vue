<template>
  <div class="dashboard-body no-print">
    <!-- Admin Church Selector -->
    <div v-if="isAdmin" class="glass-panel p-6 mb-4" style="padding: 1.75rem;">
      <h4 class="mb-2">⛪ 管理教會切換</h4>
      <select v-model="adminSettingsChurch" class="form-input select-input" style="max-width: 300px;">
        <option v-for="c in CHURCHES" :key="c" :value="c">{{ c }}</option>
      </select>
      <p class="text-xs text-muted mt-2">身為 SS 中央，您可以在此切換查看各個獨立教會的專題大綱與講師清單。</p>
    </div>

    <!-- Section 1: Themes Management -->
    <section class="glass-panel p-6" style="padding: 1.75rem;">
      <h3 class="mb-4">📋 專題大綱科目編輯器</h3>

      <!-- Character Themes -->
      <div class="theme-manage-block mb-4 pt-4">
        <h5>品格力專題大綱：</h5>
        <ul class="theme-list mt-2">
          <li v-for="theme in characterThemes" :key="theme" class="theme-item">
            <span>✦ {{ theme }}</span>
            <div class="theme-item-actions">
              <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleRenameTheme('character', theme)">重新命名</button>
              <button class="btn btn-danger btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleDeleteTheme('character', theme)">刪除</button>
            </div>
          </li>
        </ul>
        <div class="add-theme-row mt-2 flex gap-2">
          <input v-model="newCharacterTheme" type="text" class="form-input text-xs" placeholder="輸入新增品格力主題..." />
          <button class="btn btn-primary btn-sm" @click="handleAddTheme('character')">新增主題</button>
        </div>
      </div>

      <!-- Coming of Age Themes -->
      <div class="theme-manage-block mb-4 pt-4 border-t">
        <h5>成年禮必修專題大綱：</h5>
        <ul class="theme-list mt-2">
          <li v-for="theme in comingOfAgeThemes" :key="theme" class="theme-item">
            <span>✦ {{ theme }}</span>
            <div class="theme-item-actions">
              <button class="btn btn-secondary btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleRenameTheme('comingOfAge', theme)">重新命名</button>
              <button class="btn btn-danger btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleDeleteTheme('comingOfAge', theme)">刪除</button>
            </div>
          </li>
        </ul>
        <div class="add-theme-row mt-2 flex gap-2">
          <input v-model="newComingOfAgeTheme" type="text" class="form-input text-xs" placeholder="輸入新增成年禮主題..." />
          <button class="btn btn-primary btn-sm" @click="handleAddTheme('comingOfAge')">新增主題</button>
        </div>
      </div>
    </section>

    <!-- Section 2: Lecturers Management -->
    <section class="glass-panel p-6" style="padding: 1.75rem;">
      <div class="flex justify-between align-center mb-4">
        <h3 class="mb-0">👨‍🏫 講師管理資料庫</h3>
        <button class="btn btn-primary btn-sm" @click="emit('open-add-lecturer')">➕ 新增講師</button>
      </div>

      <div class="lecturers-grid mt-4">
        <div v-for="lec in filteredLecturers" :key="lec.id" class="lecturer-card glass-card">
          <div class="flex justify-between align-center">
            <div>
              <h5 style="margin: 0;">
                <strong>{{ lec.name }}</strong>
                <span class="badge badge-teacher ml-2">{{ lec.title }}</span>
              </h5>
              <div class="lec-link-tags mt-1">
                <span v-if="lec.linkedUsername" class="lec-linked-badge">
                  🔗 @{{ lec.linkedUsername }}
                </span>
                <span v-else class="lec-custom-badge">
                  ✍️ 外來講員
                </span>
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-outline btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="emit('open-edit-lecturer', lec)">編輯</button>
              <button class="btn btn-danger btn-sm" style="padding: 0.15rem 0.5rem; font-size: 0.75rem;" @click="handleDeleteLecturer(lec.id)">刪除</button>
            </div>
          </div>
          <div class="course-badges mt-2">
            <span class="text-xs text-muted block">可講授課程 ({{ lec.courseIds.length }} 堂指派)：</span>
            <div class="flex flex-wrap gap-1 mt-1">
              <span v-for="cid in lec.courseIds" :key="cid" class="badge badge-student" style="font-size: 0.7rem;">
                {{ coursesStore.courses.find(c => c.id === cid)?.title || cid }}
              </span>
              <span v-if="lec.courseIds.length === 0" class="text-xs text-muted italic">尚未分配課程</span>
            </div>
          </div>
        </div>
        <div v-if="filteredLecturers.length === 0" class="text-center text-muted py-8 italic">
          目前講師資料庫空無一人，請點擊上方按鈕手動新增。
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { CHURCHES } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Lecturer } from '@/stores/courses'
import { useToast } from '@/composables/useToast'

const { confirm } = useToast()

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
const adminSettingsChurch = ref(props.currentContextChurch || '愛與話語')

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
  const value = type === 'character' ? newCharacterTheme.value.trim() : newComingOfAgeTheme.value.trim()
  if (!value) return
  coursesStore.addTheme(type, value, adminSettingsChurch.value)
  if (type === 'character') newCharacterTheme.value = ''
  else newComingOfAgeTheme.value = ''
}

function handleRenameTheme(type: 'character' | 'comingOfAge', theme: string) {
  // Note: rename via prompt is now a no-op; use inline edit in future iteration
  const newName = window.prompt(`重新命名「${theme}」為：`, theme)
  if (newName && newName.trim() && newName.trim() !== theme) {
    coursesStore.updateTheme(type, theme, newName.trim(), adminSettingsChurch.value)
  }
}

async function handleDeleteTheme(type: 'character' | 'comingOfAge', theme: string) {
  const ok = await confirm(`確定刪除主題「${theme}」？`)
  if (ok) {
    coursesStore.deleteTheme(type, theme, adminSettingsChurch.value)
  }
}

async function handleDeleteLecturer(id: string) {
  const ok = await confirm('確定刪除此講師？')
  if (ok) {
    coursesStore.deleteLecturer(id)
  }
}
</script>
