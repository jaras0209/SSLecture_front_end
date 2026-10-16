<template>
  <teleport to="body">
    <transition name="base-modal-fade">
      <div
        v-if="modelValue"
        class="bm-overlay"
        role="dialog"
        aria-modal="true"
        :aria-label="title || $t('common.dialog')"
        @click.self="closeOnBackdrop && close()"
      >
        <div
          class="bm-card glass-panel"
          :style="maxWidth ? `max-width: ${maxWidth}` : undefined"
        >
          <!-- Header -->
          <div v-if="title || $slots.header" class="bm-header">
            <slot name="header">
              <h3 class="bm-title">{{ title }}</h3>
            </slot>
            <button class="bm-close" :aria-label="$t('common.close')" @click="close">✕</button>
          </div>

          <!-- Body -->
          <div class="bm-body">
            <slot />
          </div>

          <!-- Footer (optional) -->
          <div v-if="$slots.footer" class="bm-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  /** v-model 控制是否顯示 */
  modelValue: boolean
  /** 標題列文字（不傳則可用 #header slot） */
  title?: string
  /** 內容最大寬度，例如 '600px'、'90vw' */
  maxWidth?: string
  /** 點擊背景是否關閉（預設 true） */
  closeOnBackdrop?: boolean
}>(), {
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ── Overlay ── */
.bm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

/* ── Card ── */
.bm-card {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0;
}

/* ── Header ── */
.bm-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 0.75rem;
  border-bottom: 1px solid rgba(226, 232, 240, 0.5);
}

.bm-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--text-primary);
}

.bm-close {
  background: transparent;
  border: none;
  font-size: 1.1rem;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
  line-height: 1;
  transition: color var(--transition-fast), background var(--transition-fast);
  flex-shrink: 0;
}

.bm-close:hover {
  color: var(--text-primary);
  background: rgba(100, 116, 139, 0.1);
}

/* ── Body ── */
.bm-body {
  padding: 1.25rem 1.5rem;
  flex: 1;
  overflow-y: auto;
}

/* ── Footer ── */
.bm-footer {
  padding: 0.75rem 1.5rem 1.25rem;
  border-top: 1px solid rgba(226, 232, 240, 0.5);
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

/* ── Transition ── */
.base-modal-fade-enter-active,
.base-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.base-modal-fade-enter-active .bm-card,
.base-modal-fade-leave-active .bm-card {
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease;
}

.base-modal-fade-enter-from,
.base-modal-fade-leave-to {
  opacity: 0;
}

.base-modal-fade-enter-from .bm-card {
  transform: scale(0.93) translateY(10px);
  opacity: 0;
}

.base-modal-fade-leave-to .bm-card {
  transform: scale(0.97);
  opacity: 0;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .bm-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .bm-card {
    border-radius: var(--radius-md) var(--radius-md) 0 0;
    max-height: 85vh;
  }

  .base-modal-fade-enter-from .bm-card {
    transform: translateY(30px);
    opacity: 0;
  }
}
</style>
