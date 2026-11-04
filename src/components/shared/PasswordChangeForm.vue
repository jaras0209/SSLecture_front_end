<template>
  <form class="password-change-form" novalidate @submit.prevent="submit">
    <div
      v-if="message"
      :class="['alert-box', messageType]"
      :role="messageType === 'error' ? 'alert' : 'status'"
    >
      {{ message }}
    </div>

    <div v-for="field in fields" :key="field.key" :class="['form-group', compact ? 'mb-2' : '']">
      <label
        :for="`${idPrefix}-${field.key}`"
        :class="['form-label', { 'form-label-sm': compact }]"
      >
        {{ $t(field.label) }}
      </label>
      <div class="pwd-input-wrap">
        <input
          :id="`${idPrefix}-${field.key}`"
          v-model="form[field.key]"
          :type="shown[field.key] ? 'text' : 'password'"
          :class="['form-input', { 'form-input-sm': compact }]"
          :autocomplete="field.key === 'old' ? 'current-password' : 'new-password'"
          :placeholder="$t(field.placeholder)"
          :aria-describedby="describedBy(field.key)"
        />
        <button
          type="button"
          class="pwd-eye-btn"
          :aria-label="shown[field.key] ? $t('common.hidePwd') : $t('common.showPwd')"
          :aria-pressed="shown[field.key]"
          @click="shown[field.key] = !shown[field.key]"
        >
          <svg
            v-if="!shown[field.key]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            v-else
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            aria-hidden="true"
          >
            <path
              d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
            />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        </button>
      </div>

      <div
        v-if="field.key === 'new' && form.new"
        :id="`${idPrefix}-strength`"
        class="pwd-strength-section"
      >
        <div class="pwd-bars-row">
          <div class="pwd-bar" :class="barClass(0)"></div>
          <div class="pwd-bar" :class="barClass(1)"></div>
          <div class="pwd-bar" :class="barClass(2)"></div>
          <span class="pwd-strength-label" :class="strengthClass">{{ strengthLabel }}</span>
        </div>
        <ul class="pwd-rules-list">
          <li v-for="rule in rules" :key="rule.key" :class="{ 'rule-ok': rule.ok }">
            {{ rule.ok ? '✅' : '❌' }} {{ $t(`auth.passwordRules.${rule.key}`) }}
          </li>
        </ul>
      </div>

      <p
        v-if="field.key === 'confirm' && mismatch"
        :id="`${idPrefix}-mismatch`"
        class="pwd-mismatch"
      >
        {{ $t('profile.pwdMismatch') }}
      </p>
    </div>

    <!-- The buttons: a type="submit" one submits the form -->
    <slot />
  </form>
</template>

<script setup lang="ts">
/**
 * 修改密碼表單：導覽列的對話框、個人資料視窗、強制改密碼頁共用，
 * 三處的檢查規則與欄位標示因此一致。按鈕由使用處放進預設插槽。
 */
import { computed, reactive, ref, toRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { usePasswordStrength } from '@/composables/usePasswordStrength'

type Field = 'old' | 'new' | 'confirm'

const props = withDefaults(
  defineProps<{
    /** Field ids are `${idPrefix}-old`, `-new` and `-confirm` */
    idPrefix: string
    /** Smaller fields, for a form inside another dialog */
    compact?: boolean
  }>(),
  { compact: false }
)

const emit = defineEmits<{
  /** The password was changed; `message` says so */
  changed: [message: string]
}>()

const { t } = useI18n()
const authStore = useAuthStore()

const fields: { key: Field; label: string; placeholder: string }[] = [
  { key: 'old', label: 'passwordModal.oldPassword', placeholder: 'passwordModal.oldPlaceholder' },
  { key: 'new', label: 'passwordModal.newPassword', placeholder: 'passwordModal.newPlaceholder' },
  {
    key: 'confirm',
    label: 'passwordModal.confirmPassword',
    placeholder: 'passwordModal.confirmPlaceholder'
  }
]

const form = reactive<Record<Field, string>>({ old: '', new: '', confirm: '' })
const shown = reactive<Record<Field, boolean>>({ old: false, new: false, confirm: false })
const message = ref('')
const messageType = ref<'success' | 'error'>('error')

const {
  strength,
  label: strengthLabel,
  textClass: strengthClass,
  barClass
} = usePasswordStrength(toRef(form, 'new'))

const rules = computed(() => {
  const p = form.new
  return [
    { key: 'minLength', ok: p.length >= 8 },
    { key: 'uppercase', ok: /[A-Z]/.test(p) },
    { key: 'lowercase', ok: /[a-z]/.test(p) },
    { key: 'number', ok: /[0-9]/.test(p) },
    { key: 'special', ok: /[^A-Za-z0-9]/.test(p) }
  ]
})

const mismatch = computed(() => !!form.confirm && form.new !== form.confirm)

function describedBy(key: Field) {
  if (key === 'new' && form.new) return `${props.idPrefix}-strength`
  if (key === 'confirm' && mismatch.value) return `${props.idPrefix}-mismatch`
  return undefined
}

/** Why the form can't be sent yet, or '' when it can */
function problem(): string {
  if (!form.old || !form.new || !form.confirm) return t('profile.errFillAll')
  if (form.new !== form.confirm) return t('profile.errMismatch')
  if (strength.value < 2) return t('profile.errWeak')
  if (form.new === form.old) return t('changePassword.errSame')
  return ''
}

function show(text: string, type: 'success' | 'error') {
  message.value = text
  messageType.value = type
}

function submit() {
  const username = authStore.currentUser?.username
  if (!username) return
  const why = problem()
  if (why) return show(why, 'error')

  const result = authStore.updatePassword(username, form.old, form.new)
  if (!result.success) return show(result.message, 'error')

  clearFields()
  show(result.message, 'success')
  emit('changed', result.message)
}

function clearFields() {
  Object.assign(form, { old: '', new: '', confirm: '' })
  Object.assign(shown, { old: false, new: false, confirm: false })
}

/** Empty the form, e.g. when the dialog holding it closes */
function reset() {
  clearFields()
  message.value = ''
}

defineExpose({ reset })
</script>
