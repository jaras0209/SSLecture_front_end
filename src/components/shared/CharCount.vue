<template>
  <p class="char-count" :class="{ 'char-count-near': near }">
    {{ $t('common.charCount', { n: length, max }) }}
  </p>
</template>

<script setup lang="ts">
/**
 * "已輸入 120／2000 字" under a long text field (its maxlength stops typing at the limit).
 * Highlighted once it is close, so the limit doesn't come as a surprise. Give it an id and point
 * the field's aria-describedby at it, so screen readers read the count along with the field.
 */
import { computed } from 'vue'
import { NEAR_LIMIT } from '@/utils/limits'

const props = defineProps<{ length: number; max: number }>()
const near = computed(() => props.length >= props.max * NEAR_LIMIT)
</script>

<style scoped>
.char-count {
  margin: 0.25rem 0 0;
  text-align: right;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.char-count-near {
  color: #b45309; /* Amber 700: meets WCAG AA on white */
  font-weight: 600;
}
</style>
