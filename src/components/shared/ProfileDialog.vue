<template>
  <!-- Backdrop -->
  <teleport to="body">
    <transition name="dialog-fade">
      <div v-if="modelValue" class="pd-overlay" @click.self="close">
        <div
          v-dialog="close"
          class="pd-card glass-panel"
          role="dialog"
          aria-modal="true"
          :aria-label="$t('profile.title')"
        >
          <!-- ── Header ── -->
          <div class="pd-header">
            <h3 aria-level="2" class="pd-title">⚙️ {{ $t('profile.title') }}</h3>
            <button class="pd-close" :aria-label="$t('common.close')" @click="close">✕</button>
          </div>

          <!-- ── Avatar Section ── -->
          <div class="pd-avatar-section">
            <div class="pd-avatar-wrap">
              <img
                :src="avatarSrc(draftAvatarUrl)"
                :alt="$t('profile.avatarAlt')"
                class="pd-avatar-img"
                referrerpolicy="no-referrer"
                @error="useFallbackAvatar"
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
                  <img :src="style.previewUrl" alt="" />
                  <span>{{ style.label }}</span>
                </button>
              </div>

              <!-- Custom URL -->
              <div class="pd-custom-url-row">
                <input
                  v-model="customAvatarUrl"
                  type="url"
                  class="form-input form-input-sm"
                  :aria-label="$t('profile.avatarUrl')"
                  :placeholder="$t('profile.avatarUrl')"
                  :aria-invalid="customUrlInvalid"
                  :aria-describedby="customUrlInvalid ? 'pd-avatar-url-error' : undefined"
                  @input="applyCustomUrl"
                />
              </div>
              <p v-if="customUrlInvalid" id="pd-avatar-url-error" class="pd-url-error">
                {{ $t('profile.avatarUrlInvalid') }}
              </p>
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

          <!-- ── Email (optional; can be used to sign in) ── -->
          <div class="form-group mt-3">
            <label class="form-label" for="pd-email">✉️ {{ $t('account.email') }}</label>
            <input
              id="pd-email"
              v-model="draftEmail"
              type="email"
              class="form-input"
              autocomplete="email"
              :placeholder="$t('account.emailPlaceholder')"
            />
            <p class="pd-field-note">{{ $t('account.emailNote') }}</p>
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
            <button
              type="button"
              class="pd-pwd-toggle"
              :aria-expanded="showPwd"
              aria-controls="pd-pwd-form"
              @click="showPwd = !showPwd"
            >
              🔒 {{ $t('profile.changePwd') }}
              <span class="pd-toggle-arrow">{{ showPwd ? '▲' : '▼' }}</span>
            </button>
            <transition name="review-slide">
              <div v-if="showPwd" id="pd-pwd-form" class="pd-pwd-form">
                <PasswordChangeForm id-prefix="pd-pwd" compact>
                  <div class="save-row">
                    <span></span>
                    <button type="submit" class="btn btn-secondary btn-sm">
                      {{ $t('profile.updatePwdBtn') }}
                    </button>
                  </div>
                </PasswordChangeForm>
              </div>
            </transition>
          </div>

          <!-- ── Footer Actions ── -->
          <div class="pd-footer mt-4">
            <span
              v-if="saveMsg"
              :class="['save-status', { 'save-error': !saveOk }]"
              :role="saveOk ? 'status' : 'alert'"
              >{{ saveMsg }}</span
            >
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
import { vDialog } from '@/directives/dialog'
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore } from '@/stores/auth'
import PasswordChangeForm from '@/components/shared/PasswordChangeForm.vue'
import {
  avatarSrc,
  defaultAvatarUrl,
  dicebearAvatarUrl,
  type AvatarStyleId,
  isAllowedAvatarUrl,
  useFallbackAvatar
} from '@/utils/avatar'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', val: boolean): void }>()

const authStore = useAuthStore()
const { t } = useI18n()
const { tDateTime } = useI18nHelper()

// ── Draft state ──
const draftDisplayName = ref('')
const draftRealName = ref('')
const draftEmail = ref('')
const saveOk = ref(true)
const draftAvatarUrl = ref('')
const customAvatarUrl = ref('')
const selectedStyle = ref('')
const showPwd = ref(false)
const saveMsg = ref('')

// Sync drafts when dialog opens
watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      const u = authStore.currentUser
      draftDisplayName.value = u?.displayName || ''
      draftRealName.value = u?.realName || ''
      draftEmail.value = (u && authStore.usersDb[u.username]?.email) || ''
      draftAvatarUrl.value = u?.avatarUrl || defaultAvatarUrl(u?.username ?? '')
      customAvatarUrl.value = ''
      selectedStyle.value = ''
      showPwd.value = false
      saveMsg.value = ''
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

/** The address typed isn't one an avatar may use (only https) */
const customUrlInvalid = computed(() => {
  const url = customAvatarUrl.value.trim()
  return url !== '' && !isAllowedAvatarUrl(url)
})

function applyCustomUrl() {
  const url = customAvatarUrl.value.trim()
  if (url && isAllowedAvatarUrl(url)) {
    selectedStyle.value = ''
    draftAvatarUrl.value = url
  }
}

// ── Actions ──
function saveProfile() {
  const username = authStore.currentUser?.username
  if (!username) return
  const result = authStore.updateProfile(username, {
    displayName: draftDisplayName.value.trim(),
    realName: draftRealName.value.trim(),
    avatarUrl: draftAvatarUrl.value,
    email: draftEmail.value
  })
  saveMsg.value = result.message
  saveOk.value = result.success
  // A problem (e.g. an email in use) stays until fixed; success closes the dialog
  if (!result.success) return
  setTimeout(() => {
    saveMsg.value = ''
    close()
  }, 1200)
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
  font-weight: 700;
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

.pd-url-error {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  color: #b91c1c;
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
.save-status.save-error {
  color: #b91c1c;
}

.save-status {
  font-size: 0.82rem;
  font-weight: 700;
  color: #10b981;
}
</style>
