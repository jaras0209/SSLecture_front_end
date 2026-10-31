<template>
  <div class="form-group">
    <label class="form-label">👶 {{ $t('auth.register.bindChildren') }}</label>
    <div v-if="students.length === 0" class="alert-box error">
      ⚠️ {{ $t('auth.register.noStudentsAlert', { church }) }}
    </div>
    <div v-else class="student-binding-list">
      <label v-for="std in students" :key="std" class="student-binding-option">
        <input v-model="selected" type="checkbox" :value="std" />
        <span>🎒 {{ std }}</span>
      </label>
    </div>
    <p v-if="selected.length === 0 && students.length > 0" class="field-hint">
      {{ $t('auth.register.atLeastOneStudent') }}
    </p>
  </div>
</template>

<script setup lang="ts">
/**
 * 家長選擇要綁定的孩子：列出所選教會的 SS 學員帳號。
 * 用於帳號密碼註冊（RegisterForm）與社群登入的首次資料填寫（OnboardingView）。
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { membersOf } from '@/utils/scope'

const props = defineProps<{ church: string }>()
const selected = defineModel<string[]>({ required: true })

const authStore = useAuthStore()

/** The church's student accounts */
const students = computed(() => membersOf(authStore.usersDb, 'student', props.church))

defineExpose({ students })
</script>

<style scoped>
.student-binding-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  background: #f8fafc;
}

.student-binding-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.student-binding-option:hover {
  background: rgba(59, 130, 246, 0.06);
}

.student-binding-option input[type='checkbox'] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
}

.field-hint {
  font-size: 0.78rem;
  color: #b45309;
  margin-top: 0.35rem;
  font-weight: 600;
}
</style>
