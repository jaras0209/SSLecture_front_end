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
      type="button"
      class="lang-btn"
      :class="{ active: currentLocale === 'zh-TW' }"
      :aria-pressed="currentLocale === 'zh-TW'"
      @click="handleSelect('zh-TW')"
    >
      🌐 繁中
    </button>

    <!-- EN option -->
    <button
      type="button"
      class="lang-btn"
      :class="{ active: currentLocale === 'en' }"
      :aria-pressed="currentLocale === 'en'"
      @click="handleSelect('en')"
    >
      EN
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { setLocale } from '@/i18n'
import type { SupportedLocale } from '@/i18n'

const { locale } = useI18n({ useScope: 'global' })
const currentLocale = computed(() => locale.value as SupportedLocale)

function handleSelect(lang: SupportedLocale) {
  // 若點擊目前已啟用的語系按鈕，亦自動切換至另一語系，支援單擊切換習慣
  const nextLang: SupportedLocale =
    lang === currentLocale.value ? (currentLocale.value === 'zh-TW' ? 'en' : 'zh-TW') : lang
  void setLocale(nextLang)
}
</script>

<style scoped>
/* Pill container — adapted for light glassmorphic navbar */
.lang-toggle {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  border-radius: 9999px;
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  padding: 3px;
  flex-shrink: 0;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.06);
}

/* Sliding thumb */
.lang-thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  bottom: 3px;
  width: calc(50% - 3px);
  background: #ffffff;
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: 9999px;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.12);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 4px 12px;
  border-radius: 9999px;
  white-space: nowrap;
  color: #64748b;
  transition: color 200ms ease;
  user-select: none;
  letter-spacing: 0.02em;
}

.lang-btn:hover {
  color: #1e293b;
}

.lang-btn.active {
  color: var(--primary, #3b82f6);
  font-weight: 700;
}

.lang-btn:focus-visible {
  outline: 2px solid var(--primary, #3b82f6);
  outline-offset: 2px;
  border-radius: 9999px;
}
</style>
