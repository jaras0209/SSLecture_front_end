<template>
  <span :class="['sb-badge', `sb-${status}`, `sb-${size}`]">
    {{ label }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { BookingStatus } from '@/stores/bookings'

const props = withDefaults(defineProps<{
  /** 預約狀態 */
  status: BookingStatus
  /** 字體大小，sm=較小，md=預設 */
  size?: 'sm' | 'md'
}>(), {
  size: 'md',
})

const { t } = useI18n()
const label = computed(() => t(`booking.status.${props.status}`))
</script>

<style scoped>
/* ── Base ── */
.sb-badge {
  display: inline-block;
  border-radius: 20px;
  font-weight: 700;
  white-space: nowrap;
  line-height: 1;
}

/* ── Sizes ── */
.sb-md {
  padding: 4px 11px;
  font-size: 0.78rem;
}

.sb-sm {
  padding: 2px 8px;
  font-size: 0.72rem;
}

/* ── Status Colours ── */
.sb-pending {
  background: rgba(245, 158, 11, 0.12);
  color: #D97706;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.sb-confirmed {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.25);
}

.sb-completed {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.sb-cancelled {
  background: rgba(107, 114, 128, 0.1);
  color: #6B7280;
  border: 1px solid rgba(107, 114, 128, 0.25);
}
</style>
