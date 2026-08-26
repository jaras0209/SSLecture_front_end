<template>
  <div class="unauthorized-container text-center">
    <div class="glass-panel unauthorized-card">
      <div class="emoji-illustration">🔒😅</div>
      <h1 class="title">{{ $t('unauthorized.title') }}</h1>
      <p class="subtitle">{{ $t('unauthorized.subtitle') }}</p>
      <p class="helper-text">{{ $t('unauthorized.helper') }}</p>

      <div class="actions">
        <button class="btn btn-primary" @click="goHome">
          {{ $t('unauthorized.goHome') }}
        </button>
        <button class="btn btn-outline" @click="handleLogout">
          {{ $t('unauthorized.relogin') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

function goHome() {
  router.push('/')
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.unauthorized-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: 2rem;
}

.unauthorized-card {
  max-width: 480px;
  width: 100%;
  padding: 3rem 2rem;
  border-radius: var(--radius-lg);
  border: 1px solid rgba(239, 68, 68, 0.2);
  background: rgba(255, 255, 255, 0.9);
}

.emoji-illustration {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  animation: bounce 2s infinite;
}

.title {
  font-size: 2.2rem;
  color: var(--danger);
  margin-bottom: 1rem;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.helper-text {
  color: var(--text-muted);
  font-size: 0.9rem;
  margin-bottom: 2rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}
</style>
