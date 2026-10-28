<template>
  <div id="app-container">
    <!-- Navigation Navbar (Only visible when logged in) -->
    <nav v-if="authStore.isAuthenticated" class="navbar">
      <div class="navbar-top-row">
        <router-link to="/" class="navbar-brand">
          <span class="navbar-logo-dot"></span>
          <span>Shining Star</span>
        </router-link>

        <!-- Hamburger Button (mobile only) -->
        <button
          class="hamburger-btn"
          :aria-label="mobileMenuOpen ? $t('nav.closeMenu') : $t('nav.openMenu')"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span class="hamburger-line" :class="{ open: mobileMenuOpen }"></span>
          <span class="hamburger-line" :class="{ open: mobileMenuOpen }"></span>
          <span class="hamburger-line" :class="{ open: mobileMenuOpen }"></span>
        </button>
      </div>

      <!-- Collapsible menu -->
      <div class="navbar-collapse" :class="{ 'is-open': mobileMenuOpen }">
        <ul class="navbar-menu">
          <!-- Student Link (hidden if restricted) -->
          <li v-if="canAccess('/student')">
            <router-link to="/student" class="navbar-link" @click="mobileMenuOpen = false"
              >🎒 {{ $t('nav.studentLink') }}</router-link
            >
          </li>
          <!-- Teacher Link (hidden if restricted) -->
          <li v-if="canAccess('/teacher')">
            <router-link to="/teacher" class="navbar-link" @click="mobileMenuOpen = false"
              >👨‍🏫 {{ $t('nav.teacherLink') }}</router-link
            >
          </li>
          <!-- Admin Link -->
          <li v-if="canAccess('/admin')">
            <router-link to="/admin" class="navbar-link" @click="mobileMenuOpen = false"
              >⚙️ {{ $t('nav.adminLink') }}</router-link
            >
          </li>
        </ul>

        <!-- User controls -->
        <div class="user-control-panel">
          <div class="user-meta-info">
            <img
              :src="avatarSrc(authStore.currentUser?.avatarUrl)"
              class="avatar-nav"
              alt="Avatar"
            />
            <div class="user-labels">
              <span class="username-nav">{{ authStore.currentUser?.username }}</span>
              <span :class="['badge', getBadgeClass(authStore.currentUser?.role)]">
                {{ getRoleLabel(authStore.currentUser?.role) }}
              </span>
              <span v-if="authStore.currentUser?.church" class="badge badge-church">
                ⛪ {{ authStore.currentUser.church }}
              </span>
            </div>
          </div>
          <!-- Language Switcher -->
          <LanguageSwitcher />
          <button class="btn btn-outline btn-sm action-btn" @click="showPasswordModal = true">
            🔒 {{ $t('nav.changePassword') }}
          </button>
          <button class="btn btn-outline btn-sm action-btn logout-btn" @click="handleLogout">
            {{ $t('nav.logout') }} ➔
          </button>
        </div>
      </div>
    </nav>

    <!-- Password Change Modal -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal">
      <div
        class="glass-panel modal-card"
        role="dialog"
        aria-modal="true"
        :aria-label="$t('passwordModal.title')"
      >
        <div class="modal-header">
          <h3>{{ $t('passwordModal.title') }}</h3>
          <button class="close-btn" :aria-label="$t('common.close')" @click="closePasswordModal">
            &times;
          </button>
        </div>
        <form class="mt-4" @submit.prevent="handlePasswordChange">
          <div v-if="pwdAlertMsg" :class="['alert-box', pwdAlertType]">
            {{ pwdAlertMsg }}
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('passwordModal.oldPassword') }}</label>
            <div class="pwd-input-wrap">
              <input
                v-model="pwdForm.oldPassword"
                :type="showOldPwd ? 'text' : 'password'"
                class="form-input"
                required
                :placeholder="$t('passwordModal.oldPlaceholder')"
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
          <div class="form-group">
            <label class="form-label">{{ $t('passwordModal.newPassword') }}</label>
            <div class="pwd-input-wrap">
              <input
                v-model="pwdForm.newPassword"
                :type="showNewPwd ? 'text' : 'password'"
                class="form-input"
                required
                :placeholder="$t('passwordModal.newPlaceholder')"
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
            <div v-if="pwdForm.newPassword" class="pwd-strength-section">
              <div class="pwd-bars-row">
                <div class="pwd-bar" :class="newPwdBarClass(0)"></div>
                <div class="pwd-bar" :class="newPwdBarClass(1)"></div>
                <div class="pwd-bar" :class="newPwdBarClass(2)"></div>
                <span class="pwd-strength-label" :class="newPwdTextClass">{{ newPwdLabel }}</span>
              </div>
              <ul class="pwd-rules-list">
                <li :class="{ 'rule-ok': pwdForm.newPassword.length >= 8 }">
                  {{ pwdForm.newPassword.length >= 8 ? '✅' : '❌' }}
                  {{ $t('auth.passwordRules.minLength') }}
                </li>
                <li :class="{ 'rule-ok': /[A-Z]/.test(pwdForm.newPassword) }">
                  {{ /[A-Z]/.test(pwdForm.newPassword) ? '✅' : '❌' }}
                  {{ $t('auth.passwordRules.uppercase') }}
                </li>
                <li :class="{ 'rule-ok': /[a-z]/.test(pwdForm.newPassword) }">
                  {{ /[a-z]/.test(pwdForm.newPassword) ? '✅' : '❌' }}
                  {{ $t('auth.passwordRules.lowercase') }}
                </li>
                <li :class="{ 'rule-ok': /[0-9]/.test(pwdForm.newPassword) }">
                  {{ /[0-9]/.test(pwdForm.newPassword) ? '✅' : '❌' }}
                  {{ $t('auth.passwordRules.number') }}
                </li>
                <li :class="{ 'rule-ok': /[^A-Za-z0-9]/.test(pwdForm.newPassword) }">
                  {{ /[^A-Za-z0-9]/.test(pwdForm.newPassword) ? '✅' : '❌' }}
                  {{ $t('auth.passwordRules.special') }}
                </li>
              </ul>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">{{ $t('passwordModal.confirmPassword') }}</label>
            <div class="pwd-input-wrap">
              <input
                v-model="pwdForm.confirmPassword"
                :type="showConfirmPwd ? 'text' : 'password'"
                class="form-input"
                required
                :placeholder="$t('passwordModal.confirmPlaceholder')"
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
            <p
              v-if="pwdForm.confirmPassword && pwdForm.newPassword !== pwdForm.confirmPassword"
              class="pwd-mismatch"
            >
              {{ $t('profile.pwdMismatch') }}
            </p>
          </div>
          <div class="modal-actions mt-4 flex gap-2">
            <button type="button" class="btn btn-outline w-full" @click="closePasswordModal">
              {{ $t('passwordModal.cancelBtn') }}
            </button>
            <button type="submit" class="btn btn-primary w-full">
              {{ $t('passwordModal.submitBtn') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Main router view with transition -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
    <!-- Global Toast Notifications & Confirm Dialog -->
    <AppToast />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, toRef, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useI18n } from 'vue-i18n'
import { usePasswordStrength } from '@/composables/usePasswordStrength'
import AppToast from '@/components/shared/AppToast.vue'
import LanguageSwitcher from '@/components/shared/LanguageSwitcher.vue'
import { avatarSrc } from '@/utils/avatar'
import { homeRouteFor } from '@/router/homeRoute'

const router = useRouter()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const { t } = useI18n()

// Password Change State
const mobileMenuOpen = ref(false)
const showPasswordModal = ref(false)
const showOldPwd = ref(false)
const showNewPwd = ref(false)
const showConfirmPwd = ref(false)
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const {
  strength: newPwdStrength,
  label: newPwdLabel,
  textClass: newPwdTextClass,
  barClass: newPwdBarClass
} = usePasswordStrength(toRef(pwdForm, 'newPassword'))
const pwdAlertMsg = ref('')
const pwdAlertType = ref<'success' | 'error'>('success')

function closePasswordModal() {
  showPasswordModal.value = false
  showOldPwd.value = false
  showNewPwd.value = false
  showConfirmPwd.value = false
  pwdForm.oldPassword = ''
  pwdForm.newPassword = ''
  pwdForm.confirmPassword = ''
  pwdAlertMsg.value = ''
}

function showPwdAlert(msg: string, type: 'success' | 'error') {
  pwdAlertMsg.value = msg
  pwdAlertType.value = type
  setTimeout(() => {
    pwdAlertMsg.value = ''
  }, 3000)
}

function handlePasswordChange() {
  if (!pwdForm.oldPassword || !pwdForm.newPassword || !pwdForm.confirmPassword) {
    showPwdAlert(t('profile.errFillAll'), 'error')
    return
  }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    showPwdAlert(t('profile.errMismatch'), 'error')
    return
  }
  if (newPwdStrength.value < 2) {
    showPwdAlert(t('profile.errWeak'), 'error')
    return
  }
  if (!authStore.currentUser) return

  const result = authStore.updatePassword(
    authStore.currentUser.username,
    pwdForm.oldPassword,
    pwdForm.newPassword
  )
  if (result.success) {
    showPwdAlert(result.message, 'success')
    setTimeout(() => {
      closePasswordModal()
    }, 1000)
  } else {
    showPwdAlert(result.message, 'error')
  }
}

// Dynamic navigation guards checks for link displays
function canAccess(path: string): boolean {
  if (!authStore.currentUser) return false
  const role = authStore.currentUser.role
  const username = authStore.currentUser.username

  // If the admin blocked this path for this user
  if (coursesStore.isPageRestricted(username, path)) return false

  // Role permissions checks
  if (path === '/student') {
    return role === 'student'
  }
  if (path === '/teacher') {
    return ['teacher', 'pastor', 'parent'].includes(role)
  }
  if (path === '/admin') {
    return role === 'admin'
  }

  return true
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// Another tab signed in or out (the session lives in localStorage): follow it
watch(
  () => authStore.sessionChangedElsewhere,
  () => {
    const user = authStore.currentUser
    if (user) {
      router.replace(homeRouteFor(user.role))
    } else if (router.currentRoute.value.matched.some((r) => r.meta.requiresAuth)) {
      router.replace({ name: 'Login' })
    }
  }
)

function getBadgeClass(role?: string) {
  if (role === 'admin') return 'badge-admin'
  if (role === 'teacher' || role === 'pastor') return 'badge-teacher'
  return 'badge-student'
}

function getRoleLabel(role?: string) {
  return t(`roleLabel.${role || 'student'}`)
}
</script>

<style scoped>
.main-content {
  min-height: calc(100vh - 80px);
}

.user-control-panel {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.user-meta-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.avatar-nav {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  background: white;
  border: 2px solid #e2e8f0;
}

.user-labels {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
}

.username-nav {
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--text-primary);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1rem;
}

@media (max-width: 640px) {
  .navbar-top-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
  }

  .hamburger-btn {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    padding: 6px;
    background: none;
    border: none;
    cursor: pointer;
    width: 36px;
    height: 36px;
  }

  .hamburger-line {
    display: block;
    width: 22px;
    height: 2px;
    background: var(--text-primary);
    border-radius: 2px;
    transition: all 0.25s ease;
    transform-origin: center;
  }

  .hamburger-line.open:nth-child(1) {
    transform: rotate(45deg) translate(5px, 5px);
  }
  .hamburger-line.open:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
  }
  .hamburger-line.open:nth-child(3) {
    transform: rotate(-45deg) translate(5px, -5px);
  }

  .navbar-collapse {
    display: none;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
    background: rgba(255, 255, 255, 0.98);
  }

  .navbar-collapse.is-open {
    display: flex;
  }

  .user-control-panel {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #f1f5f9;
    width: 100%;
  }

  .user-meta-info {
    flex: 1;
  }
}

/* Desktop: hide hamburger, restore horizontal layout with centered menu */
@media (min-width: 641px) {
  .hamburger-btn {
    display: none;
  }

  .navbar-top-row {
    /* Left column: logo */
    justify-self: start;
    flex: unset;
  }

  /* Collapse holds center (nav menu) + right (user controls) */
  /* We split it using display: contents so grid sees children directly */
  .navbar-collapse {
    display: contents !important;
  }

  /* Right column: user controls */
  .user-control-panel {
    justify-self: end;
    flex-wrap: nowrap;
    width: auto;
    padding-top: 0;
    border-top: none;
    gap: 1rem;
  }

  .user-meta-info {
    flex: 0 0 auto;
  }
}
</style>

<style>
/*
 * Intentionally global: used by several components, element selectors / keyframes,
 * or rules whose look depends on cascade order against main.css and other global
 * styles (scoping would raise their specificity and change what wins).
 */
/* Reset global style.css default margins if any */
#app {
  width: 100%;
  margin: 0;
  padding: 0;
  max-width: 100%;
}

.action-btn {
  font-size: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-color: #e2e8f0;
}

.action-btn:hover {
  background-color: #f8fafc;
  border-color: var(--primary);
  color: var(--primary);
}

.logout-btn:hover {
  background-color: #fef2f2;
  border-color: var(--danger);
  color: var(--danger);
}

/* Modal styles for App.vue */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-card {
  max-width: 440px;
  width: 100%;
  padding: 2rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
}

.flex {
  display: flex;
}
.gap-2 {
  gap: 0.5rem;
}
.w-full {
  width: 100%;
}

.alert-box {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  text-align: center;
}
.alert-box.success {
  background-color: #d1fae5;
  color: #065f46;
}
.alert-box.error {
  background-color: #fee2e2;
  color: #991b1b;
}

/* Password input eye button & strength indicator */
.pwd-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.pwd-input-wrap .form-input {
  padding-right: 2.75rem;
}
.pwd-eye-btn {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem;
  transition: color 0.15s ease;
}
.pwd-eye-btn:hover {
  color: var(--text-primary);
}
.pwd-eye-btn svg {
  width: 18px;
  height: 18px;
}

.pwd-strength-section {
  margin-top: 0.5rem;
}
.pwd-bars-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.pwd-bar {
  height: 5px;
  flex: 1;
  border-radius: 3px;
  transition: background 0.3s ease;
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

.pwd-strength-label {
  font-size: 0.75rem;
  font-weight: 700;
  margin-left: 4px;
  white-space: nowrap;
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

.pwd-rules-list {
  list-style: none;
  padding: 0.5rem 0.75rem;
  margin: 0.5rem 0 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-sm);
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.25rem 0.5rem;
  font-size: 0.75rem;
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
  margin-top: 0.35rem;
}

.badge-church {
  background: rgba(59, 130, 246, 0.08);
  color: var(--primary);
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-full);
  font-weight: 600;
}

@media (max-width: 640px) {
  .navbar {
    flex-direction: column;
    padding: 0;
    align-items: stretch;
  }

  .navbar-menu {
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  .navbar-menu li {
    width: 100%;
  }

  .navbar-link {
    display: block;
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius-md);
    font-size: 0.95rem;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
    font-size: 0.78rem;
    padding: 0.4rem 0.5rem;
  }
}

/* Desktop: hide hamburger, restore horizontal layout with centered menu */
@media (min-width: 641px) {
  /* Three-column grid: logo | nav links (centered) | user controls */
  .navbar {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0.75rem 2rem;
    gap: 0;
  }

  /* Center column: nav links */
  .navbar-menu {
    flex-direction: row;
    gap: 0.5rem;
    justify-self: center;
    justify-content: center;
    width: auto;
  }

  .navbar-menu li {
    width: auto;
  }

  .navbar-link {
    display: inline-flex;
    padding: 0.5rem 1rem;
    font-size: 0.95rem;
    white-space: nowrap;
  }

  .action-btn {
    flex: 0 0 auto;
    font-size: 0.75rem;
    padding: 0.35rem 0.75rem;
  }
}
</style>
