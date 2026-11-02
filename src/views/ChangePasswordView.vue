<template>
  <div class="change-pwd-wrapper">
    <div class="glass-panel change-pwd-card">
      <div class="change-pwd-icon" aria-hidden="true">🔐</div>
      <h1 class="change-pwd-title">{{ $t('changePassword.title') }}</h1>
      <p class="change-pwd-desc">{{ $t('changePassword.desc') }}</p>

      <form class="auth-form" @submit.prevent="submit">
        <div class="form-group">
          <label class="form-label" for="cp-old">{{ $t('changePassword.current') }}</label>
          <input
            id="cp-old"
            v-model="form.old"
            type="password"
            class="form-input"
            autocomplete="current-password"
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="cp-new">{{ $t('changePassword.new') }}</label>
          <input
            id="cp-new"
            v-model="form.new1"
            type="password"
            class="form-input"
            autocomplete="new-password"
            aria-describedby="cp-strength"
          />
          <p
            id="cp-strength"
            :class="['cp-strength text-xs mt-1', form.new1 ? strengthClass : 'text-muted']"
          >
            {{ form.new1 ? strengthLabel : $t('auth.passwordRules.minLength') }}
          </p>
        </div>
        <div class="form-group">
          <label class="form-label" for="cp-confirm">{{ $t('changePassword.confirm') }}</label>
          <input
            id="cp-confirm"
            v-model="form.new2"
            type="password"
            class="form-input"
            autocomplete="new-password"
          />
        </div>

        <p v-if="error" class="cp-error" role="alert">{{ error }}</p>

        <button type="submit" class="btn btn-primary w-full">
          {{ $t('changePassword.submit') }}
        </button>
        <button type="button" class="btn btn-outline w-full mt-2" @click="signOut">
          {{ $t('nav.logout') }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 強制修改密碼：管理員建立帳號或重設密碼後，使用者下次登入必須先換掉這組
 * 別人知道的密碼，才能使用系統（路由守衛會把其他頁面導到這裡）。
 */
import { reactive, ref, toRef } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { usePasswordStrength } from '@/composables/usePasswordStrength'
import { homeRouteFor } from '@/router/homeRoute'

const router = useRouter()
const { t } = useI18n()
const { toast } = useToast()
const authStore = useAuthStore()

const form = reactive({ old: '', new1: '', new2: '' })
const error = ref('')
const {
  strength,
  label: strengthLabel,
  textClass: strengthClass
} = usePasswordStrength(toRef(form, 'new1'))

function submit() {
  const username = authStore.currentUser?.username
  if (!username) return
  error.value = ''
  if (!form.old || !form.new1 || !form.new2) {
    error.value = t('profile.errFillAll')
  } else if (form.new1 !== form.new2) {
    error.value = t('profile.errMismatch')
  } else if (strength.value < 2) {
    error.value = t('profile.errWeak')
  } else if (form.new1 === form.old) {
    error.value = t('changePassword.errSame')
  }
  if (error.value) return

  const result = authStore.updatePassword(username, form.old, form.new1)
  if (!result.success) {
    error.value = result.message
    return
  }
  toast(result.message, 'success')
  router.replace(homeRouteFor(authStore.currentUser?.role))
}

function signOut() {
  authStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.change-pwd-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  padding: 2rem 1rem;
}

.change-pwd-card {
  max-width: 440px;
  width: 100%;
  padding: 2.25rem;
  border-radius: var(--radius-lg);
}

.change-pwd-icon {
  font-size: 2.4rem;
  text-align: center;
}

.change-pwd-title {
  font-size: 1.5rem;
  text-align: center;
  margin: 0.5rem 0;
}

.change-pwd-desc {
  color: var(--text-secondary);
  font-size: 0.92rem;
  text-align: center;
  margin-bottom: 1.5rem;
}

.cp-error {
  color: #b91c1c;
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}
</style>
