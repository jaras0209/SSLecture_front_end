<template>
  <Teleport to="body">
    <div
      v-if="modelValue"
      v-dialog="close"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="lecturer ? $t('teacher.lecturer.editTitle') : $t('teacher.lecturer.addTitle')"
    >
      <div class="glass-panel modal-card lecturer-modal-card">
        <h3 aria-level="2">
          {{
            lecturer
              ? '✏️ ' + $t('teacher.lecturer.editTitle')
              : '➕ ' + $t('teacher.lecturer.addTitle')
          }}
        </h3>

        <!-- Mode Toggle -->
        <div class="link-mode-toggle mt-4">
          <button
            id="btn-link-mode"
            class="link-mode-btn"
            :class="{ active: lecturerForm.linkMode === 'link' }"
            @click="setLinkMode('link')"
          >
            🔗 {{ $t('teacher.lecturer.linkMode') }}
          </button>
          <button
            id="btn-custom-mode"
            class="link-mode-btn"
            :class="{ active: lecturerForm.linkMode === 'custom' }"
            @click="setLinkMode('custom')"
          >
            ✍️ {{ $t('teacher.lecturer.customMode') }}
          </button>
        </div>

        <!-- Link Mode: pick from teachers in church -->
        <div v-if="lecturerForm.linkMode === 'link'" class="form-group mt-4">
          <label for="select-linked-teacher" class="form-label">{{
            $t('teacher.lecturer.selectAccount')
          }}</label>
          <select
            id="select-linked-teacher"
            v-model="lecturerForm.linkedUsername"
            class="form-input select-input"
            @change="onLinkedUsernameChange(lecturerForm.linkedUsername)"
          >
            <option value="">{{ $t('teacher.lecturer.selectPlaceholder') }}</option>
            <option v-for="tc in teachersInChurch" :key="tc.username" :value="tc.username">
              {{ tc.displayLabel }}
            </option>
          </select>
          <p v-if="teachersInChurch.length === 0" class="text-xs text-muted mt-1">
            {{ $t('teacher.lecturer.noTeachersHint') }}
          </p>
          <div v-if="lecturerForm.linkedUsername" class="linked-user-preview mt-2">
            <span class="linked-chip"
              >🔗
              {{
                $t('teacher.lecturer.linkedChip', { username: lecturerForm.linkedUsername })
              }}</span
            >
            <span class="text-xs text-muted ml-2">{{ $t('teacher.lecturer.autoFillHint') }}</span>
          </div>
        </div>

        <!-- Lecturer display name (editable in custom mode, auto in link mode) -->
        <div class="form-group" :class="{ 'mt-4': lecturerForm.linkMode !== 'link' }">
          <label class="form-label">
            🎤 {{ $t('teacher.lecturer.displayName') }}
            <span v-if="lecturerForm.linkMode === 'link'" class="text-xs text-muted ml-1">{{
              $t('teacher.lecturer.autoFillNote')
            }}</span>
          </label>
          <input
            id="input-lecturer-name"
            v-model="lecturerForm.name"
            type="text"
            class="form-input"
            :placeholder="$t('teacher.lecturer.namePlaceholder')"
          />
        </div>

        <div class="form-group">
          <label for="select-lecturer-title" class="form-label">{{
            $t('teacher.lecturer.titleLabel')
          }}</label>
          <select
            id="select-lecturer-title"
            v-model="lecturerForm.title"
            class="form-input select-input"
          >
            <option value="講師">{{ $t('teacher.lecturer.titleOptions.lecturer') }}</option>
            <option value="牧師">{{ $t('teacher.lecturer.titleOptions.pastor') }}</option>
            <option value="傳道人">{{ $t('teacher.lecturer.titleOptions.preacher') }}</option>
            <option value="師母">{{ $t('teacher.lecturer.titleOptions.pastor_wife') }}</option>
            <option value="特約講師">{{ $t('teacher.lecturer.titleOptions.guest') }}</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label"
            >{{ $t('teacher.lecturer.courses') }}
            <span class="text-xs text-muted">{{ $t('teacher.lecturer.coursesHint') }}</span></label
          >
          <div class="courses-checkboxes-grid mt-2">
            <label v-for="c in coursesStore.courses" :key="c.id" class="check-item-row">
              <input v-model="lecturerForm.courseIds" type="checkbox" :value="c.id" />
              <span
                >{{ c.title }}
                <span class="text-xs text-muted"
                  >({{
                    c.category === 'bible'
                      ? $t('teacher.lecturer.courseCategory.bible')
                      : $t('teacher.lecturer.courseCategory.topic')
                  }})</span
                ></span
              >
            </label>
          </div>
        </div>

        <div class="flex justify-end gap-2 mt-6" style="display: flex; justify-content: flex-end">
          <button class="btn btn-outline btn-sm" @click="close">
            {{ $t('teacher.lecturer.cancelBtn') }}
          </button>
          <button id="btn-save-lecturer" class="btn btn-secondary btn-sm" @click="saveLecturer">
            {{ $t('teacher.lecturer.saveBtn') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { vDialog } from '@/directives/dialog'
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { Lecturer } from '@/stores/courses'

const props = defineProps<{
  /** v-model：是否顯示 */
  modelValue: boolean
  /** 要編輯的講師；null 表示新增 */
  lecturer: Lecturer | null
  /** 講師所屬教會（新增時寫入、編輯時更新） */
  church: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const { toast } = useToast()
const { t } = useI18n()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()

const lecturerForm = ref({
  name: '',
  title: '講師',
  courseIds: [] as string[],
  linkedUsername: '', // '' = 未連結輔導教師帳號
  linkMode: 'custom' as 'link' | 'custom' // 'link'=連結帳號, 'custom'=自訂
})

// Reset the form each time the modal opens: blank for "add", prefilled for "edit"
watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    const lec = props.lecturer
    lecturerForm.value = lec
      ? {
          name: lec.name,
          title: lec.title,
          courseIds: [...lec.courseIds],
          linkedUsername: lec.linkedUsername || '',
          linkMode: lec.linkedUsername ? 'link' : 'custom'
        }
      : { name: '', title: '講師', courseIds: [], linkedUsername: '', linkMode: 'custom' }
  },
  { immediate: true }
)

function close() {
  emit('update:modelValue', false)
}

// Teachers available in current church for the link-account dropdown
const teachersInChurch = computed(() => {
  const church = props.church
  return Object.entries(authStore.usersDb)
    .filter(([, u]) => u.role === 'teacher' && u.church === church)
    .map(([username, u]) => ({
      username,
      displayLabel: u.realName
        ? `${u.realName}（${username}）`
        : u.displayName
          ? `${u.displayName}（${username}）`
          : `@${username}`,
      name: u.realName || u.displayName || username
    }))
})

// Switch between linking a teacher account and a custom lecturer name.
// Link mode clears the name so it is re-filled from the selected account.
function setLinkMode(mode: 'link' | 'custom') {
  lecturerForm.value.linkMode = mode
  lecturerForm.value.linkedUsername = ''
  if (mode === 'link') lecturerForm.value.name = ''
}

// When linkedUsername changes in link-mode, auto-fill name from user db
function onLinkedUsernameChange(username: string) {
  if (!username) return
  const u = authStore.usersDb[username]
  if (u) {
    lecturerForm.value.name = u.realName || u.displayName || username
  }
}

function saveLecturer() {
  if (!lecturerForm.value.name.trim()) {
    toast(t('teacher.lecturer.nameRequired'), 'warning')
    return
  }
  const linkedUsername =
    lecturerForm.value.linkMode === 'link' ? lecturerForm.value.linkedUsername || '' : ''

  if (props.lecturer) {
    coursesStore.updateLecturer(
      props.lecturer.id,
      lecturerForm.value.name,
      lecturerForm.value.title,
      lecturerForm.value.courseIds,
      props.church,
      linkedUsername
    )
  } else {
    coursesStore.addLecturer(
      lecturerForm.value.name,
      lecturerForm.value.title,
      lecturerForm.value.courseIds,
      props.church,
      linkedUsername || undefined
    )
  }
  close()
  toast(t('teacher.lecturer.savedToast'))
}
</script>

<style scoped>
.link-mode-toggle {
  display: flex;
  gap: 0.5rem;
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 10px;
  padding: 0.35rem;
}

.link-mode-btn {
  flex: 1;
  padding: 0.55rem 0.75rem;
  font-size: 0.82rem;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.link-mode-btn.active {
  background: var(--primary);
  color: white;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
}

.linked-user-preview {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
}

.linked-chip {
  font-size: 0.78rem;
  font-weight: 700;
  color: #047857;
}

.courses-checkboxes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  max-height: 220px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid rgba(99, 102, 241, 0.12);
  border-radius: 8px;
  background: rgba(248, 250, 252, 0.8);
}
</style>

<style>
/*
 * Intentionally global: used by several components, element selectors / keyframes,
 * or rules whose look depends on cascade order against main.css and other global
 * styles (scoping would raise their specificity and change what wins).
 *
 * Every selector is guarded by :where(body:has(.teacher-dashboard)) so these rules only apply
 * while that page is on screen; otherwise they would keep applying to other pages
 * after the user switches account in the same tab. :where() adds no specificity.
 */
/* Lecturer modal — classes used only here. Shared modal/checkbox styles
   (.modal-overlay, .modal-card, .check-item-row) stay in TeacherDashboard.vue. */
:where(body:has(.teacher-dashboard)) .lecturer-modal-card {
  max-width: 620px;
  width: 90%;
  max-height: 88vh;
  overflow-y: auto;
  padding: 2rem;
}
</style>
