<template>
  <form class="auth-form" @submit.prevent="handleLogin">
    <div class="form-group">
      <label class="form-label" for="login-username">{{ $t('auth.login.username') }}</label>
      <input
        id="login-username"
        v-model="username"
        type="text"
        class="form-input"
        :placeholder="$t('auth.login.usernamePlaceholder')"
        autocomplete="username"
        required
      />
    </div>
    <div class="form-group">
      <label class="form-label" for="login-password">{{ $t('auth.login.password') }}</label>
      <div class="pwd-input-wrap">
        <input
          id="login-password"
          v-model="password"
          :type="showLoginPwd ? 'text' : 'password'"
          class="form-input"
          :placeholder="$t('auth.login.passwordPlaceholder')"
          required
        />
        <button
          type="button"
          class="pwd-eye-btn"
          :title="showLoginPwd ? $t('common.hidePwd') : $t('common.showPwd')"
          @click="showLoginPwd = !showLoginPwd"
        >
          <svg
            v-if="!showLoginPwd"
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
    </div>
    <!-- Keep the sign-in on this device; otherwise it ends after 2 hours idle or when the
         browser closes (utils/session.ts). Off by default: churches share computers. -->
    <div class="remember-row">
      <label class="remember-label" for="login-remember">
        <input
          id="login-remember"
          v-model="remember"
          type="checkbox"
          aria-describedby="login-remember-hint"
        />
        {{ $t('auth.login.remember') }}
      </label>
      <p id="login-remember-hint" class="remember-hint">{{ $t('auth.login.rememberHint') }}</p>
    </div>
    <button type="submit" class="btn btn-primary w-full">{{ $t('auth.login.submit') }}</button>
    <div class="forgot-pwd-row">
      <button type="button" class="forgot-pwd-link" @click="emit('forgot-password')">
        🔐 {{ $t('auth.login.forgotPassword') }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { afterLoginRoute } from '@/router/homeRoute'

// Credentials are owned by LoginView so the demo-account chips can fill them
const username = defineModel<string>('username', { required: true })
const password = defineModel<string>('password', { required: true })

const emit = defineEmits<{
  'forgot-password': []
}>()

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { toast } = useToast()
const { t } = useI18n()

const showLoginPwd = ref(false)
const remember = ref(false)

function handleLogin() {
  if (!username.value || !password.value) {
    toast(t('auth.validation.fillAll'), 'error')
    return
  }
  const result = authStore.login(username.value, password.value, remember.value)
  if (result.success) {
    toast(result.message, 'success')
    // Back to the page they were sent here from, if they may open it; else their home
    const role = authStore.currentUser?.role
    const back = role ? afterLoginRoute(route.query.redirect, role, router) : undefined
    setTimeout(() => {
      router.push(back ?? '/')
    }, 500)
  } else {
    toast(result.message, 'error')
  }
}
</script>

<style scoped src="./auth-shared.css"></style>

<style scoped>
/* Remember me */
.remember-row {
  margin: -0.25rem 0 1rem;
}

.remember-label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
}

.remember-label input {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
}

.remember-hint {
  margin: 0.2rem 0 0 1.55rem;
  font-size: 0.76rem;
  color: var(--text-muted);
}

/* Forgot Password */
.forgot-pwd-row {
  text-align: center;
  margin-top: 0.75rem;
}

.forgot-pwd-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-family: var(--font-family);
  font-weight: 600;
  cursor: pointer;
  transition: color var(--transition-fast);
  padding: 0;
}

.forgot-pwd-link:hover {
  color: var(--primary);
}
</style>
