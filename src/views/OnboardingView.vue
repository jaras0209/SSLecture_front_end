<template>
  <div class="onboarding-wrapper">
    <div class="glass-panel onboarding-card">

      <!-- Header -->
      <div class="onboarding-header text-center">
        <img
          v-if="authStore.currentUser?.avatarUrl"
          :src="authStore.currentUser!.avatarUrl"
          :alt="authStore.currentUser!.displayName || '使用者'"
          class="user-avatar"
        />
        <div v-else class="user-avatar-placeholder">👤</div>

        <h1 class="onboarding-title">歡迎加入 Shining Star！</h1>
        <p class="onboarding-greeting">
          嗨，<strong>{{ authStore.currentUser?.displayName || authStore.currentUser?.username || '新成員' }}</strong>！<br />
          請填寫以下資料以完成帳號設定。
        </p>
      </div>

      <!-- Alert -->
      <div v-if="alertMessage" :class="['alert-box', alertType]">
        {{ alertMessage }}
      </div>

      <!-- Form -->
      <form @submit.prevent="handleComplete" class="auth-form">

        <!-- 教會選擇（必填） -->
        <div class="form-group">
          <label class="form-label" for="ob-church">
            ⛪ 所屬教會
            <span class="field-required">*</span>
          </label>
          <select
            v-model="selectedChurch"
            id="ob-church"
            class="form-input select-input"
            required
          >
            <option value="" disabled>請選擇您所屬的教會</option>
            <option v-for="church in CHURCHES" :key="church" :value="church">
              {{ church }}
            </option>
          </select>
        </div>

        <!-- 自訂 username（可選） -->
        <div class="form-group">
          <label class="form-label" for="ob-username">
            👤 自訂帳號名稱
            <span class="field-hint-inline">（選填，預設使用社群顯示名稱）</span>
          </label>
          <input
            v-model="customUsername"
            id="ob-username"
            type="text"
            class="form-input"
            :placeholder="authStore.currentUser?.displayName || '留空則使用社群顯示名稱'"
            autocomplete="username"
          />
        </div>

        <!-- 邀請碼（可選，升級角色） -->
        <div class="form-group">
          <label class="form-label" for="ob-invite-code">
            🎫 邀請碼
            <span class="field-hint-inline">（選填，非學員身分需要）</span>
          </label>
          <div class="invite-code-wrap">
            <input
              v-model="inviteCodeInput"
              id="ob-invite-code"
              type="text"
              class="form-input"
              placeholder="例如：SS-TCH-A3F7"
              @input="onInviteCodeInput"
              autocomplete="off"
              style="text-transform: uppercase; letter-spacing: 0.1em;"
            />
            <span v-if="inviteCodeStatus === 'valid'" class="invite-badge valid">✅ 有效</span>
            <span v-else-if="inviteCodeStatus === 'invalid'" class="invite-badge invalid">❌ 無效</span>
          </div>
          <!-- 邀請碼有效時顯示角色與教會資訊 -->
          <div v-if="inviteCodeStatus === 'valid' && validatedInvite" class="invite-info">
            🎉 將以
            <strong>{{ ROLE_LABELS[validatedInvite.role] }}</strong>
            身分完成設定
            <span v-if="validatedInvite.church">（{{ validatedInvite.church }}）</span>
          </div>
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full"
          :disabled="isSubmitting || !selectedChurch"
        >
          {{ isSubmitting ? '設定中...' : '完成帳號設定' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, CHURCHES } from '@/stores/auth'
import type { UserRole, InviteCode } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'SS 學員',
  teacher: '輔導教師',
  pastor:  '分區牧者',
  parent:  '關懷家長',
  admin:   'SS 中央'
}

const selectedChurch = ref('')
const customUsername  = ref('')
const inviteCodeInput = ref('')
const inviteCodeStatus = ref<'idle' | 'valid' | 'invalid'>('idle')
const validatedInvite  = ref<InviteCode | null>(null)
const isSubmitting = ref(false)
const alertMessage = ref('')
const alertType    = ref<'success' | 'error'>('success')

function showAlert(msg: string, type: 'success' | 'error' = 'success') {
  alertMessage.value = msg
  alertType.value = type
  setTimeout(() => { alertMessage.value = '' }, 4000)
}

function getRoleRedirectPath(role?: UserRole | string): string {
  if (role === 'student') return '/student'
  if (role === 'admin') return '/admin'
  return '/teacher'
}

function onInviteCodeInput() {
  const code = inviteCodeInput.value.trim().toUpperCase()
  if (!code) {
    inviteCodeStatus.value = 'idle'
    validatedInvite.value = null
    return
  }
  const invite = authStore.validateInviteCode(code)
  if (invite) {
    inviteCodeStatus.value = 'valid'
    validatedInvite.value = invite
    // 若邀請碼有指定教會，自動填入
    if (invite.church) {
      selectedChurch.value = invite.church
    }
  } else {
    inviteCodeStatus.value = 'invalid'
    validatedInvite.value = null
  }
}

async function handleComplete() {
  if (!selectedChurch.value) {
    showAlert('請選擇所屬教會！', 'error')
    return
  }
  if (inviteCodeInput.value && inviteCodeStatus.value !== 'valid') {
    showAlert('邀請碼無效，請確認後重試。', 'error')
    return
  }

  isSubmitting.value = true
  const result = await authStore.completeProfile({
    churchId:   selectedChurch.value,
    username:   customUsername.value || undefined,
    inviteCode: inviteCodeInput.value || undefined
  })
  isSubmitting.value = false

  if (result.success) {
    showAlert('帳號設定完成！', 'success')
    setTimeout(() => {
      router.replace(getRoleRedirectPath(authStore.currentUser?.role))
    }, 500)
  } else {
    showAlert(result.message || '設定失敗，請重試。', 'error')
  }
}

onMounted(() => {
  // 若使用者未登入，導向登入頁
  if (!authStore.currentUser) {
    router.replace('/login')
    return
  }
  // 若已有 church（非首次登入），直接導向 Dashboard
  if (authStore.currentUser.church) {
    router.replace(getRoleRedirectPath(authStore.currentUser.role))
  }
})
</script>

<style scoped>
.onboarding-wrapper {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: calc(100vh - 80px);
  padding: 2rem;
  padding-top: 3rem;
}

.onboarding-card {
  max-width: 500px;
  width: 100%;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.92);
}

/* Header */
.onboarding-header {
  margin-bottom: 2rem;
}

.user-avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid rgba(var(--color-primary-rgb, 99, 102, 241), 0.3);
  margin-bottom: 1rem;
}

.user-avatar-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(var(--color-primary-rgb, 99, 102, 241), 0.1);
  font-size: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
}

.onboarding-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-text-primary, #1e1b4b);
  margin: 0 0 0.5rem;
}

.onboarding-greeting {
  font-size: 0.95rem;
  color: var(--color-text-secondary, #6b7280);
  line-height: 1.6;
  margin: 0;
}

/* Invite code */
.invite-code-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.invite-badge {
  white-space: nowrap;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.invite-badge.valid {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
}

.invite-badge.invalid {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
}

.invite-info {
  margin-top: 0.5rem;
  font-size: 0.85rem;
  color: #059669;
  background: rgba(16, 185, 129, 0.06);
  border-radius: var(--radius-sm, 8px);
  padding: 0.4rem 0.75rem;
}

.field-required {
  color: #ef4444;
  margin-left: 2px;
}

.field-hint-inline {
  font-size: 0.78rem;
  font-weight: 400;
  color: var(--color-text-secondary, #9ca3af);
  margin-left: 4px;
}

.select-input {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
}
</style>
