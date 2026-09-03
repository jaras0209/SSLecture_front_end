<template>
  <div
    class="lang-toggle"
    :class="{ 'is-en': currentLocale === 'en' }"
    role="group"
    :aria-label="$t('nav.langLabel')"
  >
    <!-- Sliding thumb indicator -->
    <div class="lang-thumb" aria-hidden="true"></div>

    <!-- zh-TW option -->
    <button
      class="lang-btn"
      :class="{ active: currentLocale === 'zh-TW' }"
      :aria-pressed="currentLocale === 'zh-TW'"
      @click="switchTo('zh-TW')"
    >
      🇹🇼 繁中
    </button>

    <!-- EN option -->
    <button
      class="lang-btn"
      :class="{ active: currentLocale === 'en' }"
      :aria-pressed="currentLocale === 'en'"
      @click="switchTo('en')"
    >
      🇺🇸 EN
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import type { SupportedLocale } from '@/i18n'

const { locale } = useI18n()
const currentLocale = computed(() => locale.value as SupportedLocale)

function switchTo(lang: SupportedLocale) {
  setLocale(lang)
}
</script>

<style scoped>
/* Pill container */
.lang-toggle {
  position: relative;
  display: flex;
  align-items: center;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  padding: 3px;
  flex-shrink: 0;
}

/* Sliding thumb */
.lang-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  bottom: 3px;
  width: calc(50% - 3px);
  background: rgba(255, 255, 255, 0.92);
  border-radius: 15px;
  box-shadow: 0 1px 5px rgba(0, 0, 0, 0.15);
  transition: transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

/* Move thumb to EN side */
.is-en .lang-thumb {
  transform: translateX(100%);
}

/* Language option buttons */
.lang-btn {
  position: relative;
  z-index: 1;
  flex: 1;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 15px;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.6);
  transition: color 200ms ease;
  user-select: none;
  letter-spacing: 0.02em;
}

.lang-btn:hover {
  color: rgba(255, 255, 255, 0.88);
}

.lang-btn.active {
  color: var(--primary, #6366f1);
}

.lang-btn:focus-visible {
  outline: 2px solid rgba(255, 255, 255, 0.7);
  outline-offset: 2px;
  border-radius: 14px;
}
</style>
