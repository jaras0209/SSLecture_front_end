<template>
  <!-- Divider -->
  <div class="divider">
    <span class="divider-text">{{ $t('auth.social.divider') }}</span>
  </div>

  <!-- Third Party Logins -->
  <div class="social-login-grid">
    <button
      type="button"
      class="social-btn google-btn"
      :disabled="isRedirecting"
      @click="loginWithGoogle"
    >
      <img
        src="https://cdn-icons-png.flaticon.com/512/300/300221.png"
        alt="Google"
        class="social-icon"
      />
      {{
        isRedirecting && redirectTarget === 'google'
          ? $t('auth.social.connecting')
          : $t('auth.social.google')
      }}
    </button>
    <button
      type="button"
      class="social-btn line-btn"
      :disabled="isRedirecting"
      @click="loginWithLine"
    >
      <img
        src="https://cdn-icons-png.flaticon.com/512/124/124027.png"
        alt="LINE"
        class="social-icon"
      />
      {{
        isRedirecting && redirectTarget === 'line'
          ? $t('auth.social.connecting')
          : $t('auth.social.line')
      }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// OAuth redirect 狀態
const isRedirecting = ref(false)
const redirectTarget = ref<'google' | 'line' | null>(null)

// OAuth 真實 redirect 函式
function loginWithGoogle() {
  isRedirecting.value = true
  redirectTarget.value = 'google'
  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/google`
}

function loginWithLine() {
  isRedirecting.value = true
  redirectTarget.value = 'line'
  window.location.href = `${import.meta.env.VITE_API_BASE_URL}/oauth2/authorization/line`
}
</script>

<style scoped>
/* Divider */
.divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e2e8f0;
}

.divider-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 0 0.75rem;
  font-weight: 600;
}

/* Social Buttons */
.social-login-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-full);
  border: 1px solid #e2e8f0;
  background: white;
  font-family: var(--font-family);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.social-btn:hover {
  background: #f8fafc;
  transform: translateY(-1px);
}

.social-icon {
  width: 18px;
  height: 18px;
}

/* Google / LINE 品牌色 */
.google-btn:hover {
  border-color: #4285f4;
  color: #4285f4;
  background: rgba(66, 133, 244, 0.06);
  transform: translateY(-1px);
}

.line-btn:hover {
  border-color: #06c755;
  color: #06c755;
  background: rgba(6, 199, 85, 0.06);
  transform: translateY(-1px);
}

.social-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
