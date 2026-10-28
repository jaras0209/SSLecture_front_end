<template>
  <!-- Backdrop -->
  <teleport to="body">
    <transition name="dialog-fade">
      <div v-if="modelValue" class="pd-overlay" @click.self="close">
        <div
          class="pd-card glass-panel"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('profile.title')"
        >
          <!-- ── Header ── -->
          <div class="pd-header">
            <h3 class="pd-title">⚙️ {{ $t('profile.title') }}</h3>
            <button class="pd-close" :aria-label="$t('common.close')" @click="close">✕</button>
          </div>

          <!-- ── Avatar Section ── -->
          <div class="pd-avatar-section">
            <div class="pd-avatar-wrap">
              <img
                :src="avatarSrc(draftAvatarUrl)"
                :alt="$t('profile.avatarAlt')"
                class="pd-avatar-img"
              />
              <div class="pd-role-badge" :title="roleLabel">{{ roleBadge }}</div>
            </div>

            <!-- Preset styles -->
            <div class="pd-avatar-presets">
              <p class="pd-label">{{ $t('profile.chooseStyle') }}</p>
              <div class="pd-preset-grid">
                <button
                  v-for="style in avatarStyles"
                  :key="style.id"
                  class="pd-preset-btn"
                  :class="{ active: selectedStyle === style.id }"
                  :title="style.label"
                  @click="applyPresetStyle(style.id)"
                >
                  <img :src="style.previewUrl" :alt="style.label" />
                  <span>{{ style.label }}</span>
                </button>
              </div>

              <!-- Custom URL -->
              <div class="pd-custom-url-row">
                <input
                  v-model="customAvatarUrl"
                  type="url"
                  class="form-input form-input-sm"
                  :placeholder="$t('profile.avatarUrl')"
                  @input="applyCustomUrl"
                />
              </div>
            </div>
          </div>

          <!-- ── Nickname ── -->
          <div class="form-group mt-4">
            <label class="form-label" for="pd-nickname">✏️ {{ $t('profile.nickname') }}</label>
            <input
              id="pd-nickname"
              v-model="draftDisplayName"
              type="text"
              maxlength="20"
              class="form-input"
              :placeholder="$t('profile.nicknamePlaceholder')"
            />
            <p class="pd-char-hint">
              {{ $t('profile.charCount', { n: draftDisplayName.length }) }}
            </p>
          </div>

          <!-- ── Real Name ── -->
          <div class="form-group mt-3">
            <label class="form-label" for="pd-realname">
              👤 {{ $t('profile.realName') }}
              <span class="pd-field-badge">{{ $t('profile.adminVisible') }}</span>
            </label>
            <input
              id="pd-realname"
              v-model="draftRealName"
              type="text"
              maxlength="20"
              class="form-input"
              :placeholder="$t('profile.realNamePlaceholder')"
            />
            <p class="pd-field-note">🔒 {{ $t('profile.realNameNote') }}</p>
          </div>

          <!-- ── Info (readonly) ── -->
          <div class="pd-info-grid mt-3">
            <div class="pd-info-item">
              <span class="pd-info-lbl">🆔 {{ $t('profile.infoUsername') }}</span>
              <span class="pd-info-val">{{ authStore.currentUser?.username }}</span>
            </div>
            <div class="pd-info-item">
              <span class="pd-info-lbl">👤 {{ $t('profile.infoRole') }}</span>
              <span class="pd-info-val">{{ roleLabel }}</span>
            </div>
            <div v-if="authStore.currentUser?.church" class="pd-info-item">
              <span class="pd-info-lbl">⛪ {{ $t('profile.infoChurch') }}</span>
              <span class="pd-info-val">{{ authStore.currentUser?.church }}</span>
            </div>
            <div v-if="authStore.currentUser?.lastLoginAt" class="pd-info-item">
              <span class="pd-info-lbl">🕐 {{ $t('profile.infoLastLogin') }}</span>
              <span class="pd-info-val">{{ tDateTime(authStore.currentUser?.lastLoginAt) }}</span>
            </div>
          </div>

          <!-- ── Change Password (collapsible) ── -->
          <div class="pd-pwd-section mt-4">
            <button type="button" class="pd-pwd-toggle" @click="showPwd = !showPwd">
              🔒 {{ $t('profile.changePwd') }}
              <span class="pd-toggle-arrow">{{ showPwd ? '▲' : '▼' }}</span>
            </button>
            <transition name="review-slide">
              <div v-if="showPwd" class="pd-pwd-form">
                <div v-if="pwdMsg" :class="['pd-pwd-alert', pwdMsgType]">
                  {{ pwdMsg }}
                </div>
                <div class="form-group mb-2">
                  <label class="form-label form-label-sm">{{ $t('profile.oldPwd') }}</label>
                  <div class="pwd-input-wrap">
                    <input
                      v-model="pwd.old"
                      :type="showOldPwd ? 'text' : 'password'"
                      class="form-input form-input-sm"
                      :placeholder="$t('profile.oldPwdPlaceholder')"
                    />
                    <button
                      type="button"
                      class="pwd-eye-btn"
                      :title="showOldPwd ? $t('common.hidePwd') : $t('common.showPwd')"
                      @click="showOldPwd = !showOldPwd"
                    >
                      <svg
                        v-if="!showOldPwd"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
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
                      >
                        <path
                          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div class="form-group mb-2">
                  <label class="form-label form-label-sm">{{ $t('profile.newPwd') }}</label>
                  <div class="pwd-input-wrap">
                    <input
                      v-model="pwd.new1"
                      :type="showNewPwd ? 'text' : 'password'"
                      class="form-input form-input-sm"
                      :placeholder="$t('profile.newPwdPlaceholder')"
                    />
                    <button
                      type="button"
                      class="pwd-eye-btn"
                      :title="showNewPwd ? $t('common.hidePwd') : $t('common.showPwd')"
                      @click="showNewPwd = !showNewPwd"
                    >
                      <svg
                        v-if="!showNewPwd"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
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
                      >
                        <path
                          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    </button>
                  </div>
                  <!-- Password Strength Indicator & Rules -->
                  <div v-if="pwd.new1" class="pwd-strength-section">
                    <div class="pwd-strength-wrap">
                      <div class="pwd-bars">
                        <div class="pwd-bar" :class="pwdStrengthClass(0)"></div>
                        <div class="pwd-bar" :class="pwdStrengthClass(1)"></div>
                        <div class="pwd-bar" :class="pwdStrengthClass(2)"></div>
                      </div>
                      <span class="pwd-label" :class="pwdStrengthTextClass">{{
                        pwdStrengthLabel
                      }}</span>
                    </div>
                    <ul class="pwd-rules-list">
                      <li :class="{ 'rule-ok': pwd.new1.length >= 8 }">
                        {{ pwd.new1.length >= 8 ? '✅' : '❌' }}
                        {{ $t('auth.passwordRules.minLength') }}
                      </li>
                      <li :class="{ 'rule-ok': /[A-Z]/.test(pwd.new1) }">
                        {{ /[A-Z]/.test(pwd.new1) ? '✅' : '❌' }}
                        {{ $t('auth.passwordRules.uppercase') }}
                      </li>
                      <li :class="{ 'rule-ok': /[a-z]/.test(pwd.new1) }">
                        {{ /[a-z]/.test(pwd.new1) ? '✅' : '❌' }}
                        {{ $t('auth.passwordRules.lowercase') }}
                      </li>
                      <li :class="{ 'rule-ok': /[0-9]/.test(pwd.new1) }">
                        {{ /[0-9]/.test(pwd.new1) ? '✅' : '❌' }}
                        {{ $t('auth.passwordRules.number') }}
                      </li>
                      <li :class="{ 'rule-ok': /[^A-Za-z0-9]/.test(pwd.new1) }">
                        {{ /[^A-Za-z0-9]/.test(pwd.new1) ? '✅' : '❌' }}
                        {{ $t('auth.passwordRules.special') }}
                      </li>
                    </ul>
                  </div>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label form-label-sm">{{ $t('profile.confirmPwd') }}</label>
                  <div class="pwd-input-wrap">
                    <input
                      v-model="pwd.new2"
                      :type="showConfirmPwd ? 'text' : 'password'"
                      class="form-input form-input-sm"
                      :placeholder="$t('profile.confirmPwdPlaceholder')"
                    />
                    <button
                      type="button"
                      class="pwd-eye-btn"
                      :title="showConfirmPwd ? $t('common.hidePwd') : $t('common.showPwd')"
                      @click="showConfirmPwd = !showConfirmPwd"
                    >
                      <svg
                        v-if="!showConfirmPwd"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
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
                      >
                        <path
                          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
                        />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    </button>
                  </div>
                  <p v-if="pwd.new2 && pwd.new1 !== pwd.new2" class="pwd-mismatch">
                    {{ $t('profile.pwdMismatch') }}
                  </p>
                </div>
                <div class="save-row">
                  <span></span>
                  <button type="button" class="btn btn-secondary btn-sm" @click="changePassword">
                    {{ $t('profile.updatePwdBtn') }}
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <!-- ── Footer Actions ── -->
          <div class="pd-footer mt-4">
            <span v-if="saveMsg" class="save-status">{{ saveMsg }}</span>
            <div class="pd-footer-btns">
              <button class="btn btn-ghost btn-sm" @click="close">{{ $t('common.cancel') }}</button>
              <button class="btn btn-primary btn-sm" @click="saveProfile">
                💾 {{ $t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore } from '@/stores/auth'
import { usePasswordStrength } from '@/composables/usePasswordStrength'
import { avatarSrc, defaultAvatarUrl, dicebearAvatarUrl, type AvatarStyleId } from '@/utils/avatar'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', val: boolean): void }>()

const authStore = useAuthStore()
const { t } = useI18n()
const { tDateTime } = useI18nHelper()

// ── Draft state ──
const draftDisplayName = ref('')
const draftRealName = ref('')
const draftAvatarUrl = ref('')
const customAvatarUrl = ref('')
const selectedStyle = ref('')
const showPwd = ref(false)
const showOldPwd = ref(false)
const showNewPwd = ref(false)
const showConfirmPwd = ref(false)
const saveMsg = ref('')
const pwdMsg = ref('')
const pwdMsgType = ref<'success' | 'error'>('success')
const pwd = ref({ old: '', new1: '', new2: '' })

// Sync drafts when dialog opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const u = authStore.currentUser
      draftDisplayName.value = u?.displayName || ''
      draftRealName.value = u?.realName || ''
      draftAvatarUrl.value = u?.avatarUrl || defaultAvatarUrl(u?.username ?? '')
      customAvatarUrl.value = ''
      selectedStyle.value = ''
      showPwd.value = false
      showOldPwd.value = false
      showNewPwd.value = false
      showConfirmPwd.value = false
      saveMsg.value = ''
      pwdMsg.value = ''
      pwd.value = { old: '', new1: '', new2: '' }
    }
  }
)

// ── Role display ──
const badgeMap: Record<string, string> = {
  student: '🎒',
  teacher: '👨‍🏫',
  pastor: '⛪',
  parent: '👨‍👩‍👦',
  admin: '👑'
}

const roleLabel = computed(() => t(`roleLabel.${authStore.currentUser?.role || 'student'}`))
const roleBadge = computed(() => badgeMap[authStore.currentUser?.role || ''] || '👤')

// ── Avatar Presets ──
const seed = computed(() => authStore.currentUser?.username || 'default')

const AVATAR_STYLE_LABELS: [AvatarStyleId, string][] = [
  ['fun-emoji', 'profile.avatar.funEmoji'],
  ['lorelei', 'profile.avatar.lorelei'],
  ['bottts', 'profile.avatar.bottts'],
  ['adventurer', 'profile.avatar.adventurer'],
  ['pixel-art', 'profile.avatar.pixelArt'],
  ['avataaars', 'profile.avatar.avataaars'],
  ['micah', 'profile.avatar.micah'],
  ['notionists', 'profile.avatar.notionists']
]

const avatarStyles = computed(() =>
  AVATAR_STYLE_LABELS.map(([id, labelKey]) => ({
    id,
    label: t(labelKey),
    previewUrl: avatarSrc(dicebearAvatarUrl(id, seed.value))
  }))
)

function applyPresetStyle(styleId: AvatarStyleId) {
  selectedStyle.value = styleId
  customAvatarUrl.value = ''
  draftAvatarUrl.value = dicebearAvatarUrl(styleId, seed.value)
}

function applyCustomUrl() {
  if (customAvatarUrl.value.trim()) {
    selectedStyle.value = ''
    draftAvatarUrl.value = customAvatarUrl.value.trim()
  }
}

// ── Password strength (shared composable) ──
const newPwdRef = computed(() => pwd.value.new1)
const {
  strength: newPwdStrength,
  label: pwdStrengthLabel,
  textClass: pwdStrengthTextClass,
  barClass: pwdStrengthClass
} = usePasswordStrength(newPwdRef)

// ── Actions ──
function saveProfile() {
  const username = authStore.currentUser?.username
  if (!username) return
  const result = authStore.updateProfile(username, {
    displayName: draftDisplayName.value.trim(),
    realName: draftRealName.value.trim(),
    avatarUrl: draftAvatarUrl.value
  })
  saveMsg.value = result.message
  setTimeout(() => {
    saveMsg.value = ''
    if (result.success) close()
  }, 1200)
}

function changePassword() {
  const username = authStore.currentUser?.username
  if (!username) return
  if (!pwd.value.old || !pwd.value.new1 || !pwd.value.new2) {
    pwdMsg.value = t('profile.errFillAll')
    pwdMsgType.value = 'error'
    return
  }
  if (pwd.value.new1 !== pwd.value.new2) {
    pwdMsg.value = t('profile.errMismatch')
    pwdMsgType.value = 'error'
    return
  }
  if (newPwdStrength.value < 2) {
    pwdMsg.value = t('profile.errWeak')
    pwdMsgType.value = 'error'
    return
  }
  const result = authStore.updatePassword(username, pwd.value.old, pwd.value.new1)
  pwdMsg.value = result.message
  pwdMsgType.value = result.success ? 'success' : 'error'
  if (result.success) {
    pwd.value = { old: '', new1: '', new2: '' }
    showOldPwd.value = false
    showNewPwd.value = false
    showConfirmPwd.value = false
    setTimeout(() => {
      pwdMsg.value = ''
    }, 2000)
  }
}

function close() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
/* ── Overlay ── */
.pd-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(6px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  padding: 1rem;
}

/* ── Card ── */
.pd-card {
  width: 100%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  border-radius: 20px;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
  scrollbar-width: thin;
}

/* ── Header ── */
.pd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.pd-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-primary);
}

.pd-close {
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 6px;
  transition: background 0.15s;
}
.pd-close:hover {
  background: rgba(0, 0, 0, 0.06);
}

/* ── Avatar Section ── */
.pd-avatar-section {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  flex-wrap: wrap;
}

.pd-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

.pd-avatar-img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid rgba(99, 102, 241, 0.3);
  object-fit: cover;
  background: #f1f5f9;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.15);
}

.pd-role-badge {
  position: absolute;
  bottom: -2px;
  right: -2px;
  background: white;
  border-radius: 50%;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.9rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.pd-avatar-presets {
  flex: 1;
  min-width: 220px;
}

.pd-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.pd-preset-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.pd-preset-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0.35rem 0.2rem;
  border: 2px solid #e2e8f0;
  border-radius: 10px;
  background: white;
  cursor: pointer;
  transition: all 0.15s;
  font-size: 0.6rem;
  color: var(--text-secondary);
  font-weight: 600;
}
.pd-preset-btn img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
}
.pd-preset-btn:hover {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.05);
}
.pd-preset-btn.active {
  border-color: var(--primary);
  background: rgba(99, 102, 241, 0.1);
}

.pd-custom-url-row {
  margin-top: 0.25rem;
}

/* ── Char hint ── */
.pd-char-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  text-align: right;
}

/* Real name management badge */
.pd-field-badge {
  display: inline-block;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.2);
  margin-left: 0.4rem;
  vertical-align: middle;
  letter-spacing: 0.02em;
}

.pd-field-note {
  font-size: 0.71rem;
  color: var(--text-muted);
  margin-top: 0.3rem;
  line-height: 1.5;
  background: rgba(99, 102, 241, 0.04);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
}

/* ── Info Grid ── */
.pd-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: rgba(99, 102, 241, 0.04);
  border-radius: 10px;
  padding: 0.75rem;
}

.pd-info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pd-info-lbl {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
}

.pd-info-val {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-primary);
}

/* ── Password section ── */
.pd-pwd-section {
  border-top: 1px dashed rgba(99, 102, 241, 0.2);
  padding-top: 0.75rem;
}

.pd-pwd-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  background: none;
  border: none;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 0.4rem 0;
}
.pd-toggle-arrow {
  font-size: 0.75rem;
}

.pd-pwd-form {
  padding-top: 0.75rem;
}

.pd-pwd-alert {
  padding: 0.6rem 0.85rem;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  text-align: center;
}
.pd-pwd-alert.success {
  background-color: #d1fae5;
  color: #065f46;
}
.pd-pwd-alert.error {
  background-color: #fee2e2;
  color: #991b1b;
}

.pwd-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.pwd-input-wrap .form-input {
  padding-right: 2.5rem;
}
.pwd-eye-btn {
  position: absolute;
  right: 0.65rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem;
  transition: color 0.15s ease;
}
.pwd-eye-btn:hover {
  color: var(--text-primary);
}
.pwd-eye-btn svg {
  width: 17px;
  height: 17px;
}

/* Password strength bars & rules */
.pwd-strength-section {
  margin-top: 0.4rem;
}
.pwd-strength-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.pwd-bars {
  display: flex;
  gap: 4px;
  flex: 1;
}
.pwd-bar {
  height: 4px;
  flex: 1;
  border-radius: 2px;
  transition: background 0.3s;
}
.bar-empty {
  background: #e2e8f0;
}
.bar-weak {
  background: #ef4444;
}
.bar-fair {
  background: #f59e0b;
}
.bar-medium {
  background: #3b82f6;
}
.bar-strong {
  background: #10b981;
}

.pwd-label {
  font-size: 0.72rem;
  font-weight: 700;
}
.text-weak {
  color: #ef4444;
}
.text-fair {
  color: #f59e0b;
}
.text-medium {
  color: #3b82f6;
}
.text-strong {
  color: #10b981;
}
.text-error {
  color: #ef4444;
}

.pwd-rules-list {
  list-style: none;
  padding: 0.45rem 0.65rem;
  margin: 0.4rem 0 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.2rem 0.5rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}
.pwd-rules-list li.rule-ok {
  color: #059669;
  font-weight: 600;
}

.pwd-mismatch {
  font-size: 0.75rem;
  color: #ef4444;
  font-weight: 600;
  margin-top: 0.25rem;
}

/* ── Footer ── */
.pd-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  padding-top: 1rem;
}

.pd-footer-btns {
  display: flex;
  gap: 0.5rem;
}

/* ── Dialog transition ── */
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s ease;
}
.dialog-fade-enter-active .pd-card,
.dialog-fade-leave-active .pd-card {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}
.dialog-fade-enter-from .pd-card {
  transform: scale(0.95) translateY(10px);
}
.dialog-fade-leave-to .pd-card {
  transform: scale(0.95) translateY(10px);
}

/* Review slide (reused) */
.review-slide-enter-active,
.review-slide-leave-active {
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease;
  overflow: hidden;
  max-height: 600px;
}
.review-slide-enter-from,
.review-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Utils ── */
.mt-1 {
  margin-top: 0.25rem;
}
.mt-3 {
  margin-top: 0.75rem;
}
.mt-4 {
  margin-top: 1rem;
}
.mb-2 {
  margin-bottom: 0.5rem;
}
.mb-3 {
  margin-bottom: 0.75rem;
}
.save-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.save-status {
  font-size: 0.82rem;
  font-weight: 700;
  color: #10b981;
}
</style>
