<template>
  <div class="change-pwd-wrapper">
    <div class="glass-panel change-pwd-card">
      <div class="change-pwd-icon" aria-hidden="true">🔐</div>
      <h1 class="change-pwd-title">{{ $t('changePassword.title') }}</h1>
      <p class="change-pwd-desc">{{ $t('changePassword.desc') }}</p>

      <PasswordChangeForm id-prefix="cp" class="auth-form" @changed="goHome">
        <button type="submit" class="btn btn-primary w-full">
          {{ $t('changePassword.submit') }}
        </button>
        <button type="button" class="btn btn-outline w-full mt-2" @click="signOut">
          {{ $t('nav.logout') }}
        </button>
      </PasswordChangeForm>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 強制修改密碼：管理員建立帳號或重設密碼後，使用者下次登入必須先換掉這組
 * 別人知道的密碼，才能使用系統（路由守衛會把其他頁面導到這裡）。
 */
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { homeRouteFor } from '@/router/homeRoute'
import PasswordChangeForm from '@/components/shared/PasswordChangeForm.vue'

const router = useRouter()
const { toast } = useToast()
const authStore = useAuthStore()

function goHome(message: string) {
  toast(message, 'success')
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
</style>
