<template>
  <div v-if="password" :id="id" class="pwd-strength-section">
    <div class="pwd-bars-row">
      <div class="pwd-bar" :class="barClass(0)"></div>
      <div class="pwd-bar" :class="barClass(1)"></div>
      <div class="pwd-bar" :class="barClass(2)"></div>
      <span class="pwd-strength-label" :class="textClass">{{ label }}</span>
    </div>
    <ul class="pwd-rules-list">
      <template v-for="check in checks" :key="check.key">
        <li :class="['pwd-rule', { 'rule-ok': check.ok, 'rule-required': check.required }]">
          {{ check.ok ? '✅' : '❌' }} {{ $t(`auth.passwordRules.${check.key}`) }}
        </li>
        <li v-if="check.required" class="pwd-rules-heading">
          {{ $t('auth.passwordRules.pickTwo') }}
        </li>
      </template>
    </ul>
  </div>
</template>

<script setup lang="ts">
/**
 * 密碼強度條與規則清單：註冊與修改密碼共用，規則來自 usePasswordStrength，
 * 所以這裡顯示的就是送出時檢查的規則。
 */
import { toRef } from 'vue'
import { usePasswordStrength } from '@/composables/usePasswordStrength'

const props = defineProps<{
  password: string
  /** For the field's aria-describedby */
  id?: string
}>()

const { label, textClass, barClass, checks } = usePasswordStrength(toRef(props, 'password'))
</script>

<style scoped>
/* The required item and the "two of these" heading span both columns */
.pwd-rules-list .rule-required,
.pwd-rules-list .pwd-rules-heading {
  grid-column: 1 / -1;
}

.pwd-rules-heading {
  font-weight: 600;
  color: var(--text-secondary);
  margin-top: 0.15rem;
}
</style>
