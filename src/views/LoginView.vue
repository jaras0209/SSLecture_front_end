<template>
  <div class="login-wrapper">
    <div class="glass-panel login-card">
      <div class="login-lang-row">
        <LanguageSwitcher />
      </div>
      <div class="brand-header text-center">
        <span class="logo-orb">✨</span>
        <h1 class="brand-title">Shining Star</h1>
        <p class="brand-tagline">{{ $t('auth.tagline') }}</p>
      </div>

      <!-- Tab Buttons -->
      <div class="auth-tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          {{ $t('auth.tabs.login') }}
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >
          {{ $t('auth.tabs.register') }}
        </button>
      </div>

      <!-- Login / Register forms (KeepAlive keeps each form's input across tab switches) -->
      <KeepAlive>
        <LoginForm
          v-if="activeTab === 'login'"
          v-model:username="loginForm.username"
          v-model:password="loginForm.password"
          @forgot-password="showForgotModal = true"
        />
        <RegisterForm v-else />
      </KeepAlive>

      <SocialLoginButtons />

      <!-- Quick Demo Access Helper -->
      <div class="demo-helper">
        <p class="demo-title">💡 {{ $t('auth.demo.title') }}</p>
        <div class="demo-chips">
          <span class="demo-chip" @click="fillDemo('student')">{{
            $t('auth.demo.chipStudent')
          }}</span>
          <span class="demo-chip" @click="fillDemo('teacher')">{{
            $t('auth.demo.chipTeacher')
          }}</span>
          <span class="demo-chip" @click="fillDemo('admin')">{{ $t('auth.demo.chipAdmin') }}</span>
          <span class="demo-chip" @click="fillDemo('parent')">{{
            $t('auth.demo.chipParent')
          }}</span>
          <span class="demo-chip" @click="fillDemo('pastor')">{{
            $t('auth.demo.chipPastor')
          }}</span>
        </div>
      </div>
    </div>

    <ForgotPasswordModal v-model="showForgotModal" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher.vue'
import LoginForm from '@/components/auth/LoginForm.vue'
import RegisterForm from '@/components/auth/RegisterForm.vue'
import SocialLoginButtons from '@/components/auth/SocialLoginButtons.vue'
import ForgotPasswordModal from '@/components/auth/ForgotPasswordModal.vue'

const { toast } = useToast()
const { t } = useI18n()

const activeTab = ref<'login' | 'register'>('login')
const showForgotModal = ref(false)

// Owned here (not in LoginForm) so the demo chips below can fill it from either tab
const loginForm = reactive({
  username: '',
  password: ''
})

function fillDemo(role: string) {
  loginForm.username = role
  loginForm.password = '123456'
  toast(t('auth.demo.filled', { role }), 'success')
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  padding: 2rem;
}

.login-card {
  max-width: 480px;
  width: 100%;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.9);
}

.login-lang-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

.brand-header {
  margin-bottom: 2rem;
}

.logo-orb {
  font-size: 2.5rem;
  display: inline-block;
  margin-bottom: 0.5rem;
  animation: spin-pulse 3s infinite linear;
}

.brand-title {
  font-size: 2.4rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.25rem;
}

.brand-tagline {
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
}

/* Tabs */
.auth-tabs {
  display: flex;
  background: #f1f5f9;
  padding: 0.25rem;
  border-radius: var(--radius-full);
  margin-bottom: 1.5rem;
}

.tab-btn {
  flex: 1;
  padding: 0.6rem;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn.active {
  background: white;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

/* Demo chip list */
.demo-helper {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px dashed #e2e8f0;
  text-align: center;
}

.demo-title {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.demo-chips {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.demo-chip {
  padding: 0.25rem 0.6rem;
  background: rgba(59, 130, 246, 0.08);
  color: var(--primary);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.demo-chip:hover {
  background: var(--primary);
  color: white;
}

@keyframes spin-pulse {
  0% {
    transform: rotate(0deg) scale(1);
  }
  50% {
    transform: rotate(180deg) scale(1.1);
  }
  100% {
    transform: rotate(360deg) scale(1);
  }
}
</style>
