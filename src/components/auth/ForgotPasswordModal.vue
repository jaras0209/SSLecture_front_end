<template>
  <!-- Forgot Password Modal -->
  <div v-if="open" class="modal-overlay" @click.self="open = false">
    <div
      class="glass-panel modal-card text-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="forgot-modal-title"
    >
      <div class="forgot-modal-icon">🔑</div>
      <h3 id="forgot-modal-title" aria-level="2" class="modal-title">
        {{ $t('auth.forgotModal.title') }}
      </h3>
      <p class="modal-desc">
        {{ $t('auth.forgotModal.desc1') }}
        <br />
        {{ $t('auth.forgotModal.desc2') }}
      </p>
      <div class="forgot-modal-steps">
        <div class="forgot-step">
          <span class="step-num">1</span>
          <span>{{ $t('auth.forgotModal.step1') }}</span>
        </div>
        <div class="forgot-step">
          <span class="step-num">2</span>
          <span>{{ $t('auth.forgotModal.step2') }}</span>
        </div>
        <div class="forgot-step">
          <span class="step-num">3</span>
          <span>{{ $t('auth.forgotModal.step3') }}</span>
        </div>
      </div>
      <button class="btn btn-primary w-full mt-4" @click="open = false">
        {{ $t('auth.forgotModal.understood') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
/** v-model：是否顯示 */
const open = defineModel<boolean>({ required: true })
</script>

<style scoped src="./auth-shared.css"></style>

<style scoped>
/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-card {
  max-width: 400px;
  width: 100%;
  padding: 2.5rem 2rem;
  background: white;
  border-radius: var(--radius-lg);
}

.modal-title {
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
}

.modal-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.forgot-modal-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.modal-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
  margin-bottom: 1.25rem;
}

.forgot-modal-steps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
  margin-bottom: 0.5rem;
}

.forgot-step {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.step-num {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.mt-4 {
  margin-top: 1rem;
}
</style>
