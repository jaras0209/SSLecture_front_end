<template>
  <form class="auth-form" @submit.prevent="handleRegister">
    <!-- Step 1: Invite Code (optional) -->
    <div class="form-group">
      <label class="form-label" for="reg-invite-code">
        🎫 {{ $t('auth.register.inviteCode') }}
        <span class="field-hint-inline">{{ $t('auth.register.inviteCodeHint') }}</span>
      </label>
      <div class="invite-code-wrap">
        <input
          id="reg-invite-code"
          v-model="inviteCodeInput"
          type="text"
          class="form-input"
          :placeholder="$t('common.inviteCodePlaceholder')"
          autocomplete="off"
          style="text-transform: uppercase; letter-spacing: 0.1em"
          @input="onInviteCodeInput"
        />
        <span v-if="inviteCodeStatus === 'valid'" class="invite-badge valid">{{
          $t('auth.register.inviteCodeBadgeValid')
        }}</span>
        <span v-else-if="inviteCodeStatus === 'invalid'" class="invite-badge invalid">{{
          $t('auth.register.inviteCodeBadgeInvalid')
        }}</span>
      </div>
      <!-- Validated invite info -->
      <div v-if="validatedInvite" class="invite-info-row">
        <span class="invite-tag role-tag">{{ roleLabel(validatedInvite.role) }}</span>
        <span v-if="validatedInvite.church" class="invite-tag church-tag"
          >⛪ {{ validatedInvite.church }}</span
        >
        <span class="invite-expiry">{{
          $t('auth.register.inviteExpiry', { date: tDate(validatedInvite.expiresAt) })
        }}</span>
      </div>
      <p v-if="inviteCodeStatus === 'invalid'" class="field-hint error-hint">
        {{ $t('auth.register.inviteInvalidHint') }}
      </p>
    </div>

    <!-- Divider -->
    <div class="form-section-divider"></div>

    <!-- Username -->
    <div class="form-group">
      <label class="form-label" for="reg-username">{{ $t('auth.register.username') }}</label>
      <input
        id="reg-username"
        v-model="registerForm.username"
        type="text"
        class="form-input"
        :placeholder="$t('auth.register.usernamePlaceholder')"
        required
      />
    </div>

    <!-- Password -->
    <div class="form-group">
      <label class="form-label" for="reg-password">{{ $t('auth.register.password') }}</label>
      <div class="pwd-input-wrap">
        <input
          id="reg-password"
          v-model="registerForm.password"
          :type="showRegPwd ? 'text' : 'password'"
          class="form-input"
          :placeholder="$t('auth.register.passwordPlaceholder')"
          required
        />
        <button
          type="button"
          class="pwd-eye-btn"
          :title="showRegPwd ? $t('common.hidePwd') : $t('common.showPwd')"
          @click="showRegPwd = !showRegPwd"
        >
          <svg
            v-if="!showRegPwd"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <path
              d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </div>
      <!-- Password Strength Indicator -->
      <div v-if="registerForm.password" class="pwd-strength-section">
        <div class="pwd-bars-row">
          <div class="pwd-bar" :class="regPwdBarClass(0)"></div>
          <div class="pwd-bar" :class="regPwdBarClass(1)"></div>
          <div class="pwd-bar" :class="regPwdBarClass(2)"></div>
          <span class="pwd-strength-label" :class="regPwdStrengthTextClass">{{
            regPwdStrengthLabel
          }}</span>
        </div>
        <ul class="pwd-rules-list">
          <li :class="{ 'rule-ok': registerForm.password.length >= 8 }">
            {{ registerForm.password.length >= 8 ? '✅' : '❌' }}
            {{ $t('auth.passwordRules.minLength') }}
          </li>
          <li :class="{ 'rule-ok': /[A-Z]/.test(registerForm.password) }">
            {{ /[A-Z]/.test(registerForm.password) ? '✅' : '❌' }}
            {{ $t('auth.passwordRules.uppercase') }}
          </li>
          <li :class="{ 'rule-ok': /[a-z]/.test(registerForm.password) }">
            {{ /[a-z]/.test(registerForm.password) ? '✅' : '❌' }}
            {{ $t('auth.passwordRules.lowercase') }}
          </li>
          <li :class="{ 'rule-ok': /[0-9]/.test(registerForm.password) }">
            {{ /[0-9]/.test(registerForm.password) ? '✅' : '❌' }}
            {{ $t('auth.passwordRules.number') }}
          </li>
          <li :class="{ 'rule-ok': /[^A-Za-z0-9]/.test(registerForm.password) }">
            {{ /[^A-Za-z0-9]/.test(registerForm.password) ? '✅' : '❌' }}
            {{ $t('auth.passwordRules.special') }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Role: locked by invite, or fixed to student -->
    <div class="form-group">
      <label class="form-label">{{ $t('auth.register.role') }}</label>
      <div v-if="validatedInvite" class="locked-field-display">
        {{ roleLabel(validatedInvite.role) }}
        <span class="locked-badge">{{ $t('auth.register.inviteLockedBadge') }}</span>
      </div>
      <div v-else class="locked-field-display student-only">
        {{ $t('auth.register.studentRole') }}
        <span class="locked-badge">{{ $t('auth.register.studentRoleHint') }}</span>
      </div>
    </div>

    <!-- Church: locked by invite (or selectable for student without invite) -->
    <div v-if="!validatedInvite || validatedInvite.role !== 'admin'" class="form-group">
      <label class="form-label" for="reg-church">⛪ {{ $t('auth.register.church') }}</label>
      <div v-if="validatedInvite && validatedInvite.church" class="locked-field-display">
        {{ validatedInvite.church }}
        <span class="locked-badge">{{ $t('auth.register.churchLockedBadge') }}</span>
      </div>
      <select
        v-else
        id="reg-church"
        v-model="registerForm.church"
        class="form-input select-input"
        required
      >
        <option v-for="church in CHURCHES" :key="church" :value="church">{{ church }}</option>
      </select>
    </div>

    <!-- Parent: Student Binding (only when invite is parent role) -->
    <div v-if="effectiveRole === 'parent'" class="form-group">
      <label class="form-label">👶 {{ $t('auth.register.bindChildren') }}</label>
      <div v-if="registerAvailableStudents.length === 0" class="alert-box error">
        ⚠️ {{ $t('auth.register.noStudentsAlert', { church: effectiveChurch }) }}
      </div>
      <div v-else class="student-binding-list">
        <label v-for="std in registerAvailableStudents" :key="std" class="student-binding-option">
          <input v-model="registerForm.childUsernames" type="checkbox" :value="std" />
          <span>🎒 {{ std }}</span>
        </label>
      </div>
      <p
        v-if="registerForm.childUsernames.length === 0 && registerAvailableStudents.length > 0"
        class="field-hint"
      >
        {{ $t('auth.register.atLeastOneStudent') }}
      </p>
    </div>

    <button type="submit" class="btn btn-secondary w-full">
      {{ $t('auth.register.submit') }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, toRef, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore, CHURCHES } from '@/stores/auth'
import type { UserRole, InviteCode } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { usePasswordStrength } from '@/composables/usePasswordStrength'
import { DEFAULT_CHURCH } from '@/types/auth'
import { membersOf } from '@/utils/scope'

const router = useRouter()
const authStore = useAuthStore()
const { toast } = useToast()
const { t } = useI18n()

const showRegPwd = ref(false)

// ── Invite Code State ─────────────────────────────────────────────────────────
const inviteCodeInput = ref('')
const inviteCodeStatus = ref<'idle' | 'valid' | 'invalid'>('idle')
const validatedInvite = ref<InviteCode | null>(null)

function onInviteCodeInput() {
  const code = inviteCodeInput.value.trim().toUpperCase()
  if (!code) {
    inviteCodeStatus.value = 'idle'
    validatedInvite.value = null
    return
  }
  // Only validate when code looks complete (e.g. SS-TCH-XXXX = 11 chars)
  if (code.length < 8) {
    inviteCodeStatus.value = 'idle'
    validatedInvite.value = null
    return
  }
  const result = authStore.validateInviteCode(code)
  if (result) {
    inviteCodeStatus.value = 'valid'
    validatedInvite.value = result
  } else {
    inviteCodeStatus.value = 'invalid'
    validatedInvite.value = null
  }
}

const registerForm = reactive({
  username: '',
  password: '',
  role: 'student' as UserRole,
  church: DEFAULT_CHURCH,
  childUsernames: [] as string[]
})

// The role that will actually be used during registration
const effectiveRole = computed<UserRole>(() =>
  validatedInvite.value ? validatedInvite.value.role : 'student'
)

// The church that will be used (invite-specified, or form-selected)
const effectiveChurch = computed(() => validatedInvite.value?.church || registerForm.church)

/** 角色標籤（i18n 版） */
const { tRole: roleLabel, tDate } = useI18nHelper()

// Compute available students for parent binding (uses effectiveChurch)
const registerAvailableStudents = computed(() =>
  membersOf(authStore.usersDb, 'student', effectiveChurch.value)
)

// ── Password strength ──
const {
  strength: regPwdStrength,
  label: regPwdStrengthLabel,
  textClass: regPwdStrengthTextClass,
  barClass: regPwdBarClass
} = usePasswordStrength(toRef(registerForm, 'password'))

function handleRegister() {
  if (!registerForm.username || !registerForm.password) {
    toast(t('auth.validation.fillAll'), 'error')
    return
  }
  if (regPwdStrength.value < 2) {
    toast(t('auth.validation.pwdTooWeak'), 'error')
    return
  }
  const role = effectiveRole.value
  const church = effectiveChurch.value
  if (role !== 'admin' && !church) {
    toast(t('auth.validation.selectChurch'), 'error')
    return
  }
  if (role === 'parent') {
    if (registerAvailableStudents.value.length === 0) {
      toast(t('auth.register.noStudentsAlert', { church }), 'error')
      return
    }
    if (registerForm.childUsernames.length === 0) {
      toast(t('auth.validation.parentBindStudent'), 'error')
      return
    }
  }
  const result = authStore.register(
    registerForm.username,
    registerForm.password,
    role,
    role !== 'admin' ? church : undefined,
    role === 'parent' ? registerForm.childUsernames : undefined
  )
  if (result.success) {
    if (validatedInvite.value) {
      authStore.consumeInviteCode(validatedInvite.value.code, registerForm.username)
    }
    toast(result.message, 'success')
    setTimeout(() => {
      router.push('/')
    }, 500)
  } else {
    toast(result.message, 'error')
  }
}
</script>

<style scoped src="./auth-shared.css"></style>

<style scoped>
/* Alert */
.alert-box {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  text-align: center;
}

.alert-box.error {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Church select dropdown */
.select-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1.2em;
  padding-right: 2.5rem;
}

/* Student binding list for parent */
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

/* ── Password Strength ── */
.pwd-strength-section {
  margin-top: 0.5rem;
}

.pwd-bars-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0.5rem;
}

.pwd-bar {
  height: 5px;
  flex: 1;
  border-radius: 3px;
  transition: background 0.3s;
}

.bar-empty {
  background: #e2e8f0;
}
.bar-weak {
  background: #ef4444;
}
.bar-fair {
  background: #f59e0b;
}
.bar-medium {
  background: #3b82f6;
}
.bar-strong {
  background: #10b981;
}

.pwd-strength-label {
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}
.text-weak {
  color: #ef4444;
}
.text-fair {
  color: #f59e0b;
}
.text-medium {
  color: #2563eb;
}
.text-strong {
  color: #10b981;
}

.pwd-rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}

.pwd-rules-list li {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.2s;
}

.pwd-rules-list li.rule-ok {
  color: #047857;
}

/* Invite Code UI */
.invite-code-wrap {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.invite-code-wrap .form-input {
  flex: 1;
}

.invite-badge {
  flex-shrink: 0;
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.invite-badge.valid {
  background: rgba(5, 150, 105, 0.12);
  color: #047857;
  border: 1px solid rgba(5, 150, 105, 0.3);
}

.invite-badge.invalid {
  background: rgba(239, 68, 68, 0.1);
  color: #b91c1c;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.invite-info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.invite-tag {
  font-size: 0.78rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.invite-tag.role-tag {
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
}

.invite-tag.church-tag {
  background: rgba(99, 102, 241, 0.12);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.invite-expiry {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.locked-field-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.875rem;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.06);
  border: 1px solid rgba(99, 102, 241, 0.2);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.locked-field-display.student-only {
  background: rgba(107, 114, 128, 0.06);
  border-color: rgba(107, 114, 128, 0.2);
}

.locked-badge {
  margin-left: auto;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  background: rgba(107, 114, 128, 0.1);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.form-section-divider {
  height: 1px;
  background: rgba(99, 102, 241, 0.12);
  margin: 0.25rem 0;
}

.field-hint-inline {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-left: 0.25rem;
}

.error-hint {
  color: var(--danger, #dc2626);
  font-size: 0.8rem;
  margin-top: 0.35rem;
}
</style>
