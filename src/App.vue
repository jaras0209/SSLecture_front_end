<template>
  <div id="app-container">
    <!-- Navigation Navbar (Only visible when logged in) -->
    <nav v-if="authStore.isAuthenticated" class="navbar">
      <div class="navbar-top-row">
        <router-link to="/" class="navbar-brand">
          <span class="navbar-logo-dot"></span>
          <span>SuperStart</span>
        </router-link>

        <!-- Hamburger Button (mobile only) -->
        <button class="hamburger-btn" @click="mobileMenuOpen = !mobileMenuOpen" :aria-label="mobileMenuOpen ? '關閉選單' : '開啟選單'">
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
            <router-link to="/student" class="navbar-link" @click="mobileMenuOpen = false">🎒 學習與檢視</router-link>
          </li>
          <!-- Teacher Link (hidden if restricted) -->
          <li v-if="canAccess('/teacher')">
            <router-link to="/teacher" class="navbar-link" @click="mobileMenuOpen = false">👨‍🏫 關懷與審查</router-link>
          </li>
          <!-- Admin Link -->
          <li v-if="canAccess('/admin')">
            <router-link to="/admin" class="navbar-link" @click="mobileMenuOpen = false">⚙️ SS中央控制台</router-link>
          </li>
        </ul>

        <!-- User controls -->
        <div class="user-control-panel">
          <div class="user-meta-info">
            <img :src="authStore.currentUser?.avatarUrl" class="avatar-nav" alt="Avatar" />
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
          <button @click="showPasswordModal = true" class="btn btn-outline btn-sm action-btn">
            🔒 修改密碼
          </button>
          <button @click="handleLogout" class="btn btn-outline btn-sm action-btn logout-btn">
            登出 ➔
          </button>
        </div>
      </div>
    </nav>

    <!-- Password Change Modal -->
    <div v-if="showPasswordModal" class="modal-overlay">
      <div class="glass-panel modal-card">
        <div class="modal-header">
          <h3>修改密碼</h3>
          <button @click="closePasswordModal" class="close-btn">&times;</button>
        </div>
        <form @submit.prevent="handlePasswordChange" class="mt-4">
          <div v-if="pwdAlertMsg" :class="['alert-box', pwdAlertType]">
            {{ pwdAlertMsg }}
          </div>
          <div class="form-group">
            <label class="form-label">目前密碼</label>
            <input v-model="pwdForm.oldPassword" type="password" class="form-input" required placeholder="請輸入目前的密碼" />
          </div>
          <div class="form-group">
            <label class="form-label">新密碼</label>
            <input v-model="pwdForm.newPassword" type="password" class="form-input" required placeholder="請輸入新密碼" />
          </div>
          <div class="form-group">
            <label class="form-label">確認新密碼</label>
            <input v-model="pwdForm.confirmPassword" type="password" class="form-input" required placeholder="請再次輸入新密碼" />
          </div>
          <div class="modal-actions mt-4 flex gap-2">
            <button type="submit" class="btn btn-primary w-full">確認修改</button>
            <button type="button" @click="closePasswordModal" class="btn btn-outline w-full">取消</button>
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
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import '@/assets/styles/main.css'

const router = useRouter()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()

// Password Change State
const mobileMenuOpen = ref(false)
const showPasswordModal = ref(false)
const pwdForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const pwdAlertMsg = ref('')
const pwdAlertType = ref<'success' | 'error'>('success')

function closePasswordModal() {
  showPasswordModal.value = false
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
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    showPwdAlert('新密碼與確認新密碼不相符！', 'error')
    return
  }
  if (!authStore.currentUser) return

  const result = authStore.updatePassword(authStore.currentUser.username, pwdForm.oldPassword, pwdForm.newPassword)
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

function getBadgeClass(role?: string) {
  if (role === 'admin') return 'badge-admin'
  if (role === 'teacher' || role === 'pastor') return 'badge-teacher'
  return 'badge-student'
}

function getRoleLabel(role?: string) {
  if (role === 'admin') return 'SS中央'
  if (role === 'teacher') return '輔導教師'
  if (role === 'pastor') return '分區牧者'
  if (role === 'parent') return '關懷家長'
  return 'SS'
}
</script>

<style>
/* Reset global style.css default margins if any */
#app {
  width: 100%;
  margin: 0;
  padding: 0;
  max-width: 100%;
}

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
  border: 2px solid #E2E8F0;
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

.action-btn {
  font-size: 0.75rem;
  padding: 0.35rem 0.75rem;
  border-color: #E2E8F0;
}

.action-btn:hover {
  background-color: #F8FAFC;
  border-color: var(--primary);
  color: var(--primary);
}

.logout-btn:hover {
  background-color: #FEF2F2;
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
  max-width: 400px;
  width: 100%;
  padding: 2rem;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  color: var(--text-muted);
}

.flex { display: flex; }
.gap-2 { gap: 0.5rem; }
.w-full { width: 100%; }

.alert-box {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  text-align: center;
}
.alert-box.success { background-color: #D1FAE5; color: #065F46; }
.alert-box.error { background-color: #FEE2E2; color: #991B1B; }

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

  .hamburger-line.open:nth-child(1) { transform: rotate(45deg) translate(5px, 5px); }
  .hamburger-line.open:nth-child(2) { opacity: 0; transform: scaleX(0); }
  .hamburger-line.open:nth-child(3) { transform: rotate(-45deg) translate(5px, -5px); }

  .navbar-collapse {
    display: none;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem 1rem 1rem;
    border-top: 1px solid rgba(0,0,0,0.06);
    background: rgba(255,255,255,0.98);
  }

  .navbar-collapse.is-open {
    display: flex;
  }

  .navbar-menu {
    flex-direction: column;
    gap: 0.25rem;
    width: 100%;
  }

  .navbar-menu li { width: 100%; }

  .navbar-link {
    display: block;
    padding: 0.6rem 0.75rem;
    border-radius: var(--radius-md);
    font-size: 0.95rem;
  }

  .user-control-panel {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #F1F5F9;
    width: 100%;
  }

  .user-meta-info {
    flex: 1;
  }

  .action-btn {
    flex: 1;
    justify-content: center;
    font-size: 0.78rem;
    padding: 0.4rem 0.5rem;
  }
}

/* Desktop: hide hamburger */
@media (min-width: 641px) {
  .hamburger-btn { display: none; }
  .navbar-collapse { display: flex !important; align-items: center; gap: 1.5rem; flex: 1; }
  .navbar { flex-direction: row; padding: 0.75rem 2rem; }
  .navbar-top-row { flex: 0 0 auto; }
}
</style>
