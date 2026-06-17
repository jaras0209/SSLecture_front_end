<template>
  <!-- Backdrop -->
  <teleport to="body">
    <transition name="dialog-fade">
      <div v-if="modelValue" class="pd-overlay" @click.self="close">
        <div class="pd-card glass-panel" role="dialog" aria-modal="true" aria-label="個人資料設定">

          <!-- ── Header ── -->
          <div class="pd-header">
            <h3 class="pd-title">⚙️ 個人資料設定</h3>
            <button class="pd-close" @click="close" aria-label="關閉">✕</button>
          </div>

          <!-- ── Avatar Section ── -->
          <div class="pd-avatar-section">
            <div class="pd-avatar-wrap">
              <img :src="draftAvatarUrl" alt="目前頭像" class="pd-avatar-img" />
              <div class="pd-role-badge" :title="roleLabel">{{ roleBadge }}</div>
            </div>

            <!-- Preset styles -->
            <div class="pd-avatar-presets">
              <p class="pd-label">選擇頭像風格</p>
              <div class="pd-preset-grid">
                <button
                  v-for="style in avatarStyles"
                  :key="style.id"
                  class="pd-preset-btn"
                  :class="{ active: selectedStyle === style.id }"
                  @click="applyPresetStyle(style.id)"
                  :title="style.label"
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
                  placeholder="或貼上自訂圖片網址（URL）"
                  @input="applyCustomUrl"
                />
              </div>
            </div>
          </div>

          <!-- ── Nickname ── -->
          <div class="form-group mt-4">
            <label class="form-label" for="pd-nickname">✏️ 暱稱</label>
            <input
              v-model="draftDisplayName"
              id="pd-nickname"
              type="text"
              maxlength="20"
              class="form-input"
              placeholder="留空則顯示帳號名稱"
            />
            <p class="pd-char-hint">{{ draftDisplayName.length }}/20 字元</p>
          </div>

          <!-- ── Real Name ── -->
          <div class="form-group mt-3">
            <label class="form-label" for="pd-realname">
              👤 真實姓名
              <span class="pd-field-badge">管理端可見</span>
            </label>
            <input
              v-model="draftRealName"
              id="pd-realname"
              type="text"
              maxlength="20"
              class="form-input"
              placeholder="輸入你的真實姓名（教師、牧者管理時顯示）"
            />
            <p class="pd-field-note">🔒 此欄位僅供輔導教師、牧者、管理員在管理介面識別你的身份，不對其他學員顯示。</p>
          </div>

          <!-- ── Info (readonly) ── -->
          <div class="pd-info-grid mt-3">
            <div class="pd-info-item">
              <span class="pd-info-lbl">🆔 帳號</span>
              <span class="pd-info-val">{{ authStore.currentUser?.username }}</span>
            </div>
            <div class="pd-info-item">
              <span class="pd-info-lbl">👤 身份</span>
              <span class="pd-info-val">{{ roleLabel }}</span>
            </div>
            <div class="pd-info-item" v-if="authStore.currentUser?.church">
              <span class="pd-info-lbl">⛪ 教會</span>
              <span class="pd-info-val">{{ authStore.currentUser?.church }}</span>
            </div>
            <div class="pd-info-item" v-if="authStore.currentUser?.lastLoginAt">
              <span class="pd-info-lbl">🕐 上次登入</span>
              <span class="pd-info-val">{{ authStore.currentUser?.lastLoginAt }}</span>
            </div>
          </div>

          <!-- ── Change Password (collapsible) ── -->
          <div class="pd-pwd-section mt-4">
            <button class="pd-pwd-toggle" @click="showPwd = !showPwd">
              🔒 修改密碼
              <span class="pd-toggle-arrow">{{ showPwd ? '▲' : '▼' }}</span>
            </button>
            <transition name="review-slide">
              <div v-if="showPwd" class="pd-pwd-form">
                <div class="form-group mb-2">
                  <label class="form-label form-label-sm">舊密碼</label>
                  <input v-model="pwd.old" type="password" class="form-input form-input-sm" placeholder="請輸入目前密碼" />
                </div>
                <div class="form-group mb-2">
                  <label class="form-label form-label-sm">新密碼</label>
                  <input v-model="pwd.new1" type="password" class="form-input form-input-sm" placeholder="請輸入新密碼" />
                  <!-- Strength bar (reuse same logic) -->
                  <div v-if="pwd.new1" class="pwd-strength-wrap mt-1">
                    <div class="pwd-bars">
                      <div class="pwd-bar" :class="pwdStrengthClass(0)"></div>
                      <div class="pwd-bar" :class="pwdStrengthClass(1)"></div>
                      <div class="pwd-bar" :class="pwdStrengthClass(2)"></div>
                    </div>
                    <span class="pwd-label" :class="pwdStrengthTextClass">{{ pwdStrengthLabel }}</span>
                  </div>
                </div>
                <div class="form-group mb-3">
                  <label class="form-label form-label-sm">確認新密碼</label>
                  <input v-model="pwd.new2" type="password" class="form-input form-input-sm" placeholder="再次輸入新密碼" />
                  <p v-if="pwd.new2 && pwd.new1 !== pwd.new2" class="pwd-mismatch">⚠️ 兩次密碼不一致</p>
                </div>
                <div class="save-row">
                  <span v-if="pwdMsg" :class="['save-status', pwdMsgType === 'error' ? 'text-error' : '']">{{ pwdMsg }}</span>
                  <button class="btn btn-secondary btn-sm" @click="changePassword">更新密碼</button>
                </div>
              </div>
            </transition>
          </div>

          <!-- ── Footer Actions ── -->
          <div class="pd-footer mt-4">
            <span v-if="saveMsg" class="save-status">{{ saveMsg }}</span>
            <div class="pd-footer-btns">
              <button class="btn btn-ghost btn-sm" @click="close">取消</button>
              <button class="btn btn-primary btn-sm" @click="saveProfile">💾 儲存資料</button>
            </div>
          </div>

        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ (e: 'update:modelValue', val: boolean): void }>()

const authStore = useAuthStore()

// ── Draft state ──
const draftDisplayName = ref('')
const draftRealName = ref('')
const draftAvatarUrl = ref('')
const customAvatarUrl = ref('')
const selectedStyle = ref('')
const showPwd = ref(false)
const saveMsg = ref('')
const pwdMsg = ref('')
const pwdMsgType = ref<'success' | 'error'>('success')
const pwd = ref({ old: '', new1: '', new2: '' })

// Sync drafts when dialog opens
watch(() => props.modelValue, (open) => {
  if (open) {
    const u = authStore.currentUser
    draftDisplayName.value = u?.displayName || ''
    draftRealName.value = u?.realName || ''
    draftAvatarUrl.value = u?.avatarUrl || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${u?.username}`
    customAvatarUrl.value = ''
    selectedStyle.value = ''
    showPwd.value = false
    saveMsg.value = ''
    pwdMsg.value = ''
    pwd.value = { old: '', new1: '', new2: '' }
  }
})

// ── Role display ──
const roleMap: Record<string, string> = {
  student: 'SS 學員',
  teacher: '輔導教師',
  pastor: '分區牧者',
  parent: '關懷家長',
  admin: 'SS 中央'
}
const badgeMap: Record<string, string> = {
  student: '🎒',
  teacher: '👨‍🏫',
  pastor: '⛪',
  parent: '👨‍👩‍👦',
  admin: '👑'
}

const roleLabel = computed(() => roleMap[authStore.currentUser?.role || ''] || '')
const roleBadge = computed(() => badgeMap[authStore.currentUser?.role || ''] || '👤')

// ── Avatar Presets ──
const seed = computed(() => authStore.currentUser?.username || 'default')

const avatarStyles = computed(() => [
  { id: 'fun-emoji',   label: '趣味',    previewUrl: `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${seed.value}` },
  { id: 'lorelei',     label: '人像',    previewUrl: `https://api.dicebear.com/7.x/lorelei/svg?seed=${seed.value}` },
  { id: 'bottts',      label: '機器人',  previewUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed.value}` },
  { id: 'adventurer',  label: '冒險家',  previewUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${seed.value}` },
  { id: 'pixel-art',   label: '像素風',  previewUrl: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed.value}` },
  { id: 'avataaars',   label: '卡通',    previewUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed.value}` },
  { id: 'micah',       label: '簡約',    previewUrl: `https://api.dicebear.com/7.x/micah/svg?seed=${seed.value}` },
  { id: 'notionists',  label: '插畫',    previewUrl: `https://api.dicebear.com/7.x/notionists/svg?seed=${seed.value}` },
])

function applyPresetStyle(styleId: string) {
  selectedStyle.value = styleId
  customAvatarUrl.value = ''
  draftAvatarUrl.value = `https://api.dicebear.com/7.x/${styleId}/svg?seed=${seed.value}`
}

function applyCustomUrl() {
  if (customAvatarUrl.value.trim()) {
    selectedStyle.value = ''
    draftAvatarUrl.value = customAvatarUrl.value.trim()
  }
}

// ── Password strength (for change password field) ──
function calcStrength(p: string): number {
  if (p.length < 6) return 0
  let score = 1
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return Math.min(score - 1, 3)
}

const newPwdStrength = computed(() => calcStrength(pwd.value.new1))

function pwdStrengthClass(idx: number): string {
  if (newPwdStrength.value === 0) return idx === 0 ? 'bar-weak' : 'bar-empty'
  if (newPwdStrength.value === 1) return idx <= 0 ? 'bar-fair' : 'bar-empty'
  if (newPwdStrength.value === 2) return idx <= 1 ? 'bar-medium' : 'bar-empty'
  return 'bar-strong'
}

const pwdStrengthLabel = computed(() => {
  const labels = ['弱密碼', '普通', '中等強度', '強密碼']
  return labels[newPwdStrength.value]
})

const pwdStrengthTextClass = computed(() => {
  const cls = ['text-weak', 'text-fair', 'text-medium', 'text-strong']
  return cls[newPwdStrength.value]
})

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
    pwdMsg.value = '請填寫所有密碼欄位'
    pwdMsgType.value = 'error'
    return
  }
  if (pwd.value.new1 !== pwd.value.new2) {
    pwdMsg.value = '兩次新密碼不一致'
    pwdMsgType.value = 'error'
    return
  }
  if (calcStrength(pwd.value.new1) < 2) {
    pwdMsg.value = '新密碼強度不足（需中等以上）'
    pwdMsgType.value = 'error'
    return
  }
  const result = authStore.updatePassword(username, pwd.value.old, pwd.value.new1)
  pwdMsg.value = result.message
  pwdMsgType.value = result.success ? 'success' : 'error'
  if (result.success) {
    pwd.value = { old: '', new1: '', new2: '' }
    setTimeout(() => { pwdMsg.value = '' }, 2000)
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
.pd-close:hover { background: rgba(0,0,0,0.06); }

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
  box-shadow: 0 2px 6px rgba(0,0,0,0.12);
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
.pd-toggle-arrow { font-size: 0.75rem; }

.pd-pwd-form {
  padding-top: 0.75rem;
}

/* Password strength bars */
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
.bar-empty  { background: #e2e8f0; }
.bar-weak   { background: #ef4444; }
.bar-fair   { background: #f59e0b; }
.bar-medium { background: #3b82f6; }
.bar-strong { background: #10b981; }

.pwd-label { font-size: 0.72rem; font-weight: 700; }
.text-weak   { color: #ef4444; }
.text-fair   { color: #f59e0b; }
.text-medium { color: #3b82f6; }
.text-strong { color: #10b981; }
.text-error  { color: #ef4444; }

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
  border-top: 1px solid rgba(0,0,0,0.06);
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
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to { opacity: 0; }
.dialog-fade-enter-from .pd-card { transform: scale(0.95) translateY(10px); }
.dialog-fade-leave-to .pd-card  { transform: scale(0.95) translateY(10px); }

/* Review slide (reused) */
.review-slide-enter-active,
.review-slide-leave-active {
  transition: max-height 0.3s ease, opacity 0.3s ease;
  overflow: hidden;
  max-height: 400px;
}
.review-slide-enter-from,
.review-slide-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Utils ── */
.mt-1 { margin-top: 0.25rem; }
.mt-3 { margin-top: 0.75rem; }
.mt-4 { margin-top: 1rem; }
.mb-2 { margin-bottom: 0.5rem; }
.mb-3 { margin-bottom: 0.75rem; }
.save-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
.save-status { font-size: 0.82rem; font-weight: 700; color: #10b981; }
</style>
