<template>
  <div class="callback-wrapper">
    <div class="glass-panel callback-card text-center">
      <!-- Loading 狀態 -->
      <div v-if="status === 'loading'" class="callback-loading">
        <div class="spinner-ring"></div>
        <h2 class="callback-title">{{ $t('callback.loadingTitle') }}</h2>
        <p class="callback-desc">{{ $t('callback.loadingDesc') }}</p>
      </div>

      <!-- 錯誤狀態 -->
      <div v-else-if="status === 'error'" class="callback-error">
        <div class="error-icon">⚠️</div>
        <h2 class="callback-title">{{ $t('callback.errorTitle') }}</h2>
        <p class="callback-desc">{{ errorMessage }}</p>
        <p class="callback-countdown">{{ $t('callback.countdown', { n: countdown }) }}</p>
        <button @click="goToLogin" class="btn btn-primary mt-4">{{ $t('callback.goToLogin') }}</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from 'vue-i18n'
import type { UserRole } from '@/stores/auth'

const router = useRouter()
const route  = useRoute()
const authStore = useAuthStore()
const { t } = useI18n()

const status = ref<'loading' | 'error'>('loading')
const errorMessage = ref('')
const countdown = ref(5)

function getRoleRedirectPath(role?: UserRole | string): string {
  if (role === 'student') return '/student'
  if (role === 'admin') return '/admin'
  return '/teacher'
}

function goToLogin() {
  router.push('/login?error=oauth_failed')
}

function startCountdown() {
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
      goToLogin()
    }
  }, 1000)
}

onMounted(async () => {
  const code  = route.query.code as string | undefined
  const error = route.query.error as string | undefined

  // 後端回傳錯誤
  if (error || !code) {
    status.value = 'error'
    errorMessage.value = error
      ? t('callback.errorDenied', { error })
      : t('callback.errorNoCode')
    startCountdown()
    return
  }

  // 用短效 code 換取 JWT
  const result = await authStore.exchangeOAuthCode(code)

  if (!result.success) {
    status.value = 'error'
    errorMessage.value = result.message || t('callback.errorGeneral')
    startCountdown()
    return
  }

  // 成功：依 needsOnboarding 決定導向
  if (result.needsOnboarding) {
    router.replace('/onboarding')
  } else {
    router.replace(getRoleRedirectPath(authStore.currentUser?.role))
  }
})
</script>

<style scoped>
.callback-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  padding: 2rem;
}

.callback-card {
  max-width: 420px;
  width: 100%;
  padding: 3rem 2.5rem;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.92);
}

/* Loading */
.callback-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.spinner-ring {
  width: 56px;
  height: 56px;
  border: 4px solid rgba(var(--color-primary-rgb, 99, 102, 241), 0.15);
  border-top-color: var(--color-primary, #6366f1);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.callback-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-primary, #1e1b4b);
  margin: 0;
}

.callback-desc {
  font-size: 0.9rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

/* Error */
.callback-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.error-icon {
  font-size: 3rem;
  line-height: 1;
}

.callback-countdown {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #6b7280);
  margin: 0;
}

.mt-4 { margin-top: 1rem; }
</style>
