<template>
  <!-- Toast Notifications -->
  <Teleport to="body">
    <div class="toast-container" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          :class="['toast-item', `toast-${t.type}`]"
        >
          {{ t.text }}
        </div>
      </TransitionGroup>
    </div>

    <!-- Confirm Dialog -->
    <div
      v-if="confirmState.visible"
      class="confirm-overlay"
      @click.self="resolve(false)"
    >
      <div class="confirm-dialog glass-panel">
        <p class="confirm-message">{{ confirmState.message }}</p>
        <div class="confirm-actions">
          <button class="btn btn-outline btn-sm" @click="resolve(false)">{{ $t('common.cancel') }}</button>
          <button class="btn btn-danger btn-sm" @click="resolve(true)">{{ $t('common.confirm') }}</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastProvider, resolveConfirm } from '@/composables/useToast'

const { toasts, confirmState } = useToastProvider()

function resolve(ok: boolean) {
  resolveConfirm(ok)
}
</script>

<style>
/* ── Toast Container ────────────────────────────────── */
.toast-container {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: none;
}

.toast-item {
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md, 0.75rem);
  font-size: 0.9rem;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  pointer-events: auto;
  max-width: 360px;
  color: white;
}

.toast-success { background: #22c55e; }
.toast-warning { background: #f59e0b; }
.toast-error   { background: #ef4444; }
.toast-info    { background: #6366f1; }

/* TransitionGroup animation */
.toast-enter-active, .toast-leave-active {
  transition: all 0.3s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

/* ── Confirm Dialog ─────────────────────────────────── */
.confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-dialog {
  background: white;
  border-radius: var(--radius-lg, 1rem);
  padding: 1.5rem 2rem;
  max-width: 360px;
  width: 90%;
  text-align: center;
}

.confirm-message {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  margin-bottom: 1.25rem;
  line-height: 1.6;
}

.confirm-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
}
.btn-danger:hover {
  background: #dc2626;
}
</style>
