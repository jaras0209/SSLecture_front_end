<template>
  <div class="login-wrapper">
    <div class="glass-panel login-card">
      <div class="brand-header text-center">
        <span class="logo-orb">✨</span>
        <h1 class="brand-title">SuperStart</h1>
        <p class="brand-tagline">聆聽神的話語，開啟智慧的全新一天</p>
      </div>

      <!-- Tab Buttons -->
      <div class="auth-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'login' }]"
          @click="activeTab = 'login'"
        >
          登入帳號
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'register' }]"
          @click="activeTab = 'register'"
        >
          註冊新成員
        </button>
      </div>

      <!-- Alert Message -->
      <div v-if="alertMessage" :class="['alert-box', alertType]">
        {{ alertMessage }}
      </div>

      <!-- Login Form -->
      <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label class="form-label" for="login-username">使用者帳號</label>
          <input 
            v-model="loginForm.username" 
            id="login-username" 
            type="text" 
            class="form-input" 
            placeholder="請輸入您的帳號" 
            required 
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="login-password">密碼</label>
          <div class="pwd-input-wrap">
            <input 
              v-model="loginForm.password" 
              id="login-password" 
              :type="showLoginPwd ? 'text' : 'password'" 
              class="form-input" 
              placeholder="請輸入密碼" 
              required 
            />
            <button type="button" class="pwd-eye-btn" @click="showLoginPwd = !showLoginPwd" :title="showLoginPwd ? '隱藏密碼' : '顯示密碼'">
              <svg v-if="!showLoginPwd" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
        </div>
        <button type="submit" class="btn btn-primary w-full">登入平台</button>
        <div class="forgot-pwd-row">
          <button type="button" class="forgot-pwd-link" @click="showForgotModal = true">
            🔐 忘記密碼？
          </button>
        </div>
      </form>

      <!-- Register Form -->
      <form v-else @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label class="form-label" for="reg-username">設定使用者帳號</label>
          <input 
            v-model="registerForm.username" 
            id="reg-username" 
            type="text" 
            class="form-input" 
            placeholder="請輸入帳號" 
            required 
          />
        </div>
        <div class="form-group">
          <label class="form-label" for="reg-password">設定密碼</label>
          <div class="pwd-input-wrap">
            <input 
              v-model="registerForm.password" 
              id="reg-password" 
              :type="showRegPwd ? 'text' : 'password'" 
              class="form-input" 
              placeholder="至少 8 字元，含大小寫、數字" 
              required 
            />
            <button type="button" class="pwd-eye-btn" @click="showRegPwd = !showRegPwd" :title="showRegPwd ? '隱藏密碼' : '顯示密碼'">
              <svg v-if="!showRegPwd" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            </button>
          </div>
          <!-- Password Strength Indicator -->
          <div v-if="registerForm.password" class="pwd-strength-section">
            <div class="pwd-bars-row">
              <div class="pwd-bar" :class="regPwdBarClass(0)"></div>
              <div class="pwd-bar" :class="regPwdBarClass(1)"></div>
              <div class="pwd-bar" :class="regPwdBarClass(2)"></div>
              <span class="pwd-strength-label" :class="regPwdStrengthTextClass">{{ regPwdStrengthLabel }}</span>
            </div>
            <ul class="pwd-rules-list">
              <li :class="{ 'rule-ok': registerForm.password.length >= 8 }">
                {{ registerForm.password.length >= 8 ? '✅' : '❌' }} 至少 8 個字元
              </li>
              <li :class="{ 'rule-ok': /[A-Z]/.test(registerForm.password) }">
                {{ /[A-Z]/.test(registerForm.password) ? '✅' : '❌' }} 包含英文大寫字母
              </li>
              <li :class="{ 'rule-ok': /[a-z]/.test(registerForm.password) }">
                {{ /[a-z]/.test(registerForm.password) ? '✅' : '❌' }} 包含英文小寫字母
              </li>
              <li :class="{ 'rule-ok': /[0-9]/.test(registerForm.password) }">
                {{ /[0-9]/.test(registerForm.password) ? '✅' : '❌' }} 包含數字
              </li>
              <li :class="{ 'rule-ok': /[^A-Za-z0-9]/.test(registerForm.password) }">
                {{ /[^A-Za-z0-9]/.test(registerForm.password) ? '✅' : '❌' }} 包含特殊符號（!@#$%^&*）
              </li>
            </ul>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">選擇我的角色身分</label>
          <div class="role-selector flex-wrap gap-2">
            <label class="role-option">
              <input type="radio" v-model="registerForm.role" value="student" />
              <div class="role-card">
                <span class="role-emoji">🎒</span>
                <span>SS 學員</span>
              </div>
            </label>
            <label class="role-option">
              <input type="radio" v-model="registerForm.role" value="teacher" />
              <div class="role-card">
                <span class="role-emoji">👨‍🏫</span>
                <span>輔導教師</span>
              </div>
            </label>
            <label class="role-option">
              <input type="radio" v-model="registerForm.role" value="parent" />
              <div class="role-card">
                <span class="role-emoji">👨‍👩‍👦</span>
                <span>關懷家長</span>
              </div>
            </label>
            <label class="role-option">
              <input type="radio" v-model="registerForm.role" value="pastor" />
              <div class="role-card">
                <span class="role-emoji">⛪</span>
                <span>分區牧者</span>
              </div>
            </label>
            <label class="role-option">
              <input type="radio" v-model="registerForm.role" value="admin" />
              <div class="role-card">
                <span class="role-emoji">👑</span>
                <span>SS 中央</span>
              </div>
            </label>
          </div>
        </div>

        <!-- Church Selector (hidden for admin) -->
        <div class="form-group" v-if="registerForm.role !== 'admin'">
          <label class="form-label" for="reg-church">⛪ 所屬教會</label>
          <select 
            v-model="registerForm.church" 
            id="reg-church" 
            class="form-input select-input"
            required
          >
            <option v-for="church in CHURCHES" :key="church" :value="church">{{ church }}</option>
          </select>
        </div>

        <!-- Parent: Student Binding (only for parent role) -->
        <div class="form-group" v-if="registerForm.role === 'parent'">
          <label class="form-label">👶 綁定我的孩子（SS學員帳號）</label>
          <div v-if="registerAvailableStudents.length === 0" class="alert-box error">
            ⚠️ 目前 {{ registerForm.church }} 教會尚無任何 SS學員帳號，請先由 SS學員 完成帳號註冊後，再回來建立家長帳號。
          </div>
          <div v-else class="student-binding-list">
            <label 
              v-for="std in registerAvailableStudents" 
              :key="std" 
              class="student-binding-option"
            >
              <input 
                type="checkbox" 
                :value="std" 
                v-model="registerForm.childUsernames"
              />
              <span>🎒 {{ std }}</span>
            </label>
          </div>
          <p v-if="registerForm.childUsernames.length === 0 && registerAvailableStudents.length > 0" class="field-hint">
            請至少勾選一位學員，才能建立家長帳號。
          </p>
        </div>

        <button type="submit" class="btn btn-secondary w-full">完成註冊並登入</button>
      </form>

      <!-- Divider -->
      <div class="divider">
        <span class="divider-text">或者透過社群平台快速登入</span>
      </div>

      <!-- Third Party Logins -->
      <div class="social-login-grid">
        <button 
          @click="openOAuthModal('google')" 
          type="button" 
          class="social-btn google-btn"
        >
          <img src="https://cdn-icons-png.flaticon.com/512/300/300221.png" alt="Google" class="social-icon" />
          Google 登入
        </button>
        <button 
          @click="openOAuthModal('line')" 
          type="button" 
          class="social-btn line-btn"
        >
          <img src="https://cdn-icons-png.flaticon.com/512/124/124027.png" alt="LINE" class="social-icon" />
          LINE 登入
        </button>
      </div>

      <!-- Quick Demo Access Helper -->
      <div class="demo-helper">
        <p class="demo-title">💡 快速測試帳號 (密碼皆為 123456)</p>
        <div class="demo-chips">
          <span class="demo-chip" @click="fillDemo('student')">SS學員 (student)</span>
          <span class="demo-chip" @click="fillDemo('teacher')">輔導教師 (teacher)</span>
          <span class="demo-chip" @click="fillDemo('admin')">SS中央 (admin)</span>
          <span class="demo-chip" @click="fillDemo('parent')">家長 (parent)</span>
          <span class="demo-chip" @click="fillDemo('pastor')">牧者 (pastor)</span>
        </div>
      </div>
    </div>

    <!-- Forgot Password Modal -->
    <div v-if="showForgotModal" class="modal-overlay" @click.self="showForgotModal = false">
      <div class="glass-panel modal-card text-center">
        <div class="forgot-modal-icon">🔑</div>
        <h3 class="modal-title">忘記密碼</h3>
        <p class="modal-desc">
          目前系統由教會 SS 中央管理員進行帳號管理。
          <br />
          請聯絡您的輔導教師或 SS 中央，請求幫您重設密碼。
        </p>
        <div class="forgot-modal-steps">
          <div class="forgot-step">
            <span class="step-num">1</span>
            <span>聯絡您的輔導教師或 SS 中央管理員</span>
          </div>
          <div class="forgot-step">
            <span class="step-num">2</span>
            <span>由管理員在後台將您的密碼重設為預設密碼</span>
          </div>
          <div class="forgot-step">
            <span class="step-num">3</span>
            <span>使用預設密碼登入後，即可到「修改密碼」更改新密碼</span>
          </div>
        </div>
        <button @click="showForgotModal = false" class="btn btn-primary w-full mt-4">我瞭解了</button>
      </div>
    </div>

    <!-- OAuth Simulation Modal -->
    <div v-if="showOAuthModal" class="modal-overlay">
      <div class="glass-panel modal-card text-center">
        <!-- Step 1: Role select -->
        <div v-if="oauthStep === 'role-select'">
          <h3 class="modal-title">選擇社群登入對應的身分</h3>
          <p class="modal-desc">為了方便模擬體驗，您可以指定本次社群登入所要使用的權限角色：</p>
          
          <div class="modal-roles">
            <button @click="oauthSelectRole('student')" class="btn btn-outline btn-block">
              🎒 模擬為 SS 學員
            </button>
            <button @click="oauthSelectRole('teacher')" class="btn btn-outline btn-block">
              👨‍🏫 模擬為 輔導教師
            </button>
            <button @click="oauthSelectRole('parent')" class="btn btn-outline btn-block">
              👨‍👩‍👦 模擬為 關懷家長
            </button>
            <button @click="oauthSelectRole('pastor')" class="btn btn-outline btn-block">
              ⛪ 模擬為 分區牧者
            </button>
            <button @click="oauthSelectRole('admin')" class="btn btn-outline btn-block">
              👑 模擬為 SS 中央
            </button>
          </div>
          
          <button @click="showOAuthModal = false" class="btn btn-outline btn-sm mt-4">取消</button>
        </div>

        <!-- Step 2: Church select (for non-admin) -->
        <div v-else-if="oauthStep === 'church-select'">
          <h3 class="modal-title">選擇所屬教會</h3>
          <p class="modal-desc">請選擇您所屬的教會：</p>
          <select v-model="oauthChurch" class="form-input select-input mb-4">
            <option v-for="church in CHURCHES" :key="church" :value="church">{{ church }}</option>
          </select>
          <button @click="oauthProceedAfterChurch" class="btn btn-primary w-full">下一步</button>
          <button @click="showOAuthModal = false" class="btn btn-outline btn-sm mt-2">取消</button>
        </div>

        <!-- Step 3: Student binding (for parent only) -->
        <div v-else-if="oauthStep === 'student-bind'">
          <h3 class="modal-title">綁定孩子的帳號</h3>
          <p class="modal-desc">請選擇您孩子的 SS學員帳號：</p>
          <div v-if="oauthAvailableStudents.length === 0" class="alert-box error mb-4">
            ⚠️ 目前 {{ oauthChurch }} 教會尚無任何 SS學員帳號
          </div>
          <div v-else class="student-binding-list mb-4">
            <label v-for="std in oauthAvailableStudents" :key="std" class="student-binding-option">
              <input type="checkbox" :value="std" v-model="oauthChildUsernames" />
              <span>🎒 {{ std }}</span>
            </label>
          </div>
          <button @click="confirmOAuthLogin()" class="btn btn-primary w-full" :disabled="oauthAvailableStudents.length > 0 && oauthChildUsernames.length === 0">完成登入</button>
          <button @click="showOAuthModal = false" class="btn btn-outline btn-sm mt-2">取消</button>
        </div>

        <!-- Processing state -->
        <div v-else class="loading-state">
          <div class="spinner"></div>
          <h3 class="modal-title mt-4">
            正在透過 {{ oauthProvider === 'google' ? 'Google' : 'LINE' }} 請求安全授權...
          </h3>
          <p class="modal-desc">請勿關閉視窗，正在建立安全的加密連結通訊。</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore, CHURCHES } from '@/stores/auth'
import type { UserRole } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const activeTab = ref<'login' | 'register'>('login')
const alertMessage = ref('')
const alertType = ref<'success' | 'error'>('success')
const showForgotModal = ref(false)
const showLoginPwd = ref(false)
const showRegPwd = ref(false)

// OAuth Modal State
const showOAuthModal = ref(false)
const oauthProvider = ref<'google' | 'line' | null>(null)
const oauthStep = ref<'role-select' | 'church-select' | 'student-bind' | 'processing'>('role-select')
const oauthSelectedRole = ref<UserRole>('student')
const oauthChurch = ref('愛與話語')
const oauthChildUsernames = ref<string[]>([])

const loginForm = reactive({
  username: '',
  password: ''
})

const registerForm = reactive({
  username: '',
  password: '',
  role: 'student' as UserRole,
  church: '愛與話語',
  childUsernames: [] as string[]
})

// Compute available students for parent binding
const registerAvailableStudents = computed(() => {
  return Object.keys(authStore.usersDb).filter(
    username => authStore.usersDb[username].role === 'student' &&
                authStore.usersDb[username].church === registerForm.church
  )
})

const oauthAvailableStudents = computed(() => {
  return Object.keys(authStore.usersDb).filter(
    username => authStore.usersDb[username].role === 'student' &&
                authStore.usersDb[username].church === oauthChurch.value
  )
})

function showAlert(message: string, type: 'success' | 'error' = 'success') {
  alertMessage.value = message
  alertType.value = type
  setTimeout(() => {
    alertMessage.value = ''
  }, 4000)
}

function handleLogin() {
  if (!loginForm.username || !loginForm.password) {
    showAlert('請填寫所有欄位！', 'error')
    return
  }
  const result = authStore.login(loginForm.username, loginForm.password)
  if (result.success) {
    showAlert(result.message, 'success')
    setTimeout(() => {
      router.push('/')
    }, 500)
  } else {
    showAlert(result.message, 'error')
  }
}

// ── Password strength (register form) ──
function calcRegPwdStrength(p: string): number {
  if (p.length < 6) return 0
  let score = 1
  if (p.length >= 8) score++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++
  if (/[0-9]/.test(p)) score++
  if (/[^A-Za-z0-9]/.test(p)) score++
  return Math.min(score - 1, 3)
}

const regPwdStrength = computed(() => calcRegPwdStrength(registerForm.password))

function regPwdBarClass(idx: number): string {
  const s = regPwdStrength.value
  if (s === 0) return idx === 0 ? 'bar-weak' : 'bar-empty'
  if (s === 1) return idx <= 0 ? 'bar-fair' : 'bar-empty'
  if (s === 2) return idx <= 1 ? 'bar-medium' : 'bar-empty'
  return 'bar-strong'
}

const regPwdStrengthLabel = computed(() => {
  const labels = ['弱密碼', '普通', '中等強度', '強密碼']
  return labels[regPwdStrength.value]
})

const regPwdStrengthTextClass = computed(() => {
  const cls = ['text-weak', 'text-fair', 'text-medium', 'text-strong']
  return cls[regPwdStrength.value]
})

function handleRegister() {
  if (!registerForm.username || !registerForm.password) {
    showAlert('請填寫所有欄位！', 'error')
    return
  }
  if (regPwdStrength.value < 2) {
    showAlert('密碼強度不足，請設定中等以上強度的密碼（需 8 字元以上，並含數字或特殊符號）', 'error')
    return
  }
  if (registerForm.role !== 'admin' && !registerForm.church) {
    showAlert('請選擇所屬教會！', 'error')
    return
  }
  if (registerForm.role === 'parent') {
    if (registerAvailableStudents.value.length === 0) {
      showAlert(`目前 ${registerForm.church} 教會尚無任何 SS學員帳號，請先由學員完成帳號建立！`, 'error')
      return
    }
    if (registerForm.childUsernames.length === 0) {
      showAlert('家長帳號必須至少綁定一位 SS學員！', 'error')
      return
    }
  }
  const result = authStore.register(
    registerForm.username,
    registerForm.password,
    registerForm.role,
    registerForm.role !== 'admin' ? registerForm.church : undefined,
    registerForm.role === 'parent' ? registerForm.childUsernames : undefined
  )
  if (result.success) {
    showAlert(result.message, 'success')
    setTimeout(() => {
      router.push('/')
    }, 500)
  } else {
    showAlert(result.message, 'error')
  }
}

function fillDemo(role: string) {
  loginForm.username = role
  loginForm.password = '123456'
  showAlert(`已自動帶入 ${role} 測試資料`, 'success')
}

// OAuth process
function openOAuthModal(provider: 'google' | 'line') {
  oauthProvider.value = provider
  oauthStep.value = 'role-select'
  oauthChurch.value = '愛與話語'
  oauthChildUsernames.value = []
  showOAuthModal.value = true
}

function oauthSelectRole(role: UserRole) {
  oauthSelectedRole.value = role
  if (role === 'admin') {
    confirmOAuthLogin()
  } else {
    oauthStep.value = 'church-select'
  }
}

function oauthProceedAfterChurch() {
  if (oauthSelectedRole.value === 'parent') {
    oauthStep.value = 'student-bind'
  } else {
    confirmOAuthLogin()
  }
}

async function confirmOAuthLogin() {
  oauthStep.value = 'processing'
  try {
    if (oauthProvider.value) {
      await authStore.loginWithThirdParty(
        oauthProvider.value,
        oauthSelectedRole.value,
        oauthSelectedRole.value !== 'admin' ? oauthChurch.value : undefined,
        oauthSelectedRole.value === 'parent' ? oauthChildUsernames.value : undefined
      )
      showOAuthModal.value = false
      router.push('/')
    }
  } catch (error) {
    showAlert('模擬第三方登入失敗，請重試。', 'error')
    showOAuthModal.value = false
  }
}
</script>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
  padding: 2rem;
}

.login-card {
  max-width: 480px;
  width: 100%;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.9);
}

.brand-header {
  margin-bottom: 2rem;
}

.logo-orb {
  font-size: 2.5rem;
  display: inline-block;
  margin-bottom: 0.5rem;
  animation: spin-pulse 3s infinite linear;
}

.brand-title {
  font-size: 2.4rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.25rem;
}

.brand-tagline {
  color: var(--text-secondary);
  font-size: 0.95rem;
  font-weight: 500;
}

/* Tabs */
.auth-tabs {
  display: flex;
  background: #F1F5F9;
  padding: 0.25rem;
  border-radius: var(--radius-full);
  margin-bottom: 1.5rem;
}

.tab-btn {
  flex: 1;
  padding: 0.6rem;
  border: none;
  background: transparent;
  font-family: var(--font-family);
  font-weight: 600;
  color: var(--text-secondary);
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn.active {
  background: white;
  color: var(--primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.w-full {
  width: 100%;
}

/* Alert */
.alert-box {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  font-weight: 600;
  margin-bottom: 1.25rem;
  text-align: center;
}

.alert-box.success {
  background-color: #D1FAE5;
  color: #065F46;
}

.alert-box.error {
  background-color: #FEE2E2;
  color: #991B1B;
}

/* Role selector grid */
.role-selector {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.role-option {
  cursor: pointer;
}

.role-option input {
  display: none;
}

.role-card {
  border: 2px solid #E2E8F0;
  border-radius: var(--radius-md);
  padding: 0.75rem 0.5rem;
  text-align: center;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
}

.role-card span {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-secondary);
}

.role-emoji {
  font-size: 1.5rem;
}

.role-option input:checked + .role-card {
  border-color: var(--secondary);
  background: rgba(16, 185, 129, 0.08);
}

.role-option input:checked + .role-card span {
  color: var(--secondary-hover);
}

/* Divider */
.divider {
  display: flex;
  align-items: center;
  margin: 1.5rem 0;
}

.divider::before, .divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #E2E8F0;
}

.divider-text {
  font-size: 0.75rem;
  color: var(--text-muted);
  padding: 0 0.75rem;
  font-weight: 600;
}

/* Social Buttons */
.social-login-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.social-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.6rem 1rem;
  border-radius: var(--radius-full);
  border: 1px solid #E2E8F0;
  background: white;
  font-family: var(--font-family);
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--text-secondary);
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.social-btn:hover {
  background: #F8FAFC;
  transform: translateY(-1px);
}

.social-icon {
  width: 18px;
  height: 18px;
}

/* Demo chip list */
.demo-helper {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px dashed #E2E8F0;
  text-align: center;
}

.demo-title {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.demo-chips {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.demo-chip {
  padding: 0.25rem 0.6rem;
  background: rgba(59, 130, 246, 0.08);
  color: var(--primary);
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.demo-chip:hover {
  background: var(--primary);
  color: white;
}

/* Modal Styling */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
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
  padding: 2.5rem 2rem;
  background: white;
  border-radius: var(--radius-lg);
}

.modal-title {
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
}

.modal-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.modal-roles {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-block {
  width: 100%;
  text-align: left;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
}

.btn-block:hover {
  background: rgba(59, 130, 246, 0.08);
  border-color: var(--primary);
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem 0;
}

.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(59, 130, 246, 0.1);
  border-left-color: var(--primary);
  border-radius: 50%;
  animation: spin 1s infinite linear;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes spin-pulse {
  0% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
  100% { transform: rotate(360deg) scale(1); }
}

/* Church select dropdown */
.select-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1.2em;
  padding-right: 2.5rem;
}

/* Student binding list for parent */
.student-binding-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  background: #F8FAFC;
}

.student-binding-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.student-binding-option:hover {
  background: rgba(59, 130, 246, 0.06);
}

.student-binding-option input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--primary);
  cursor: pointer;
}

.field-hint {
  font-size: 0.78rem;
  color: #B45309;
  margin-top: 0.35rem;
  font-weight: 600;
}

.mb-4 { margin-bottom: 1rem; }
.mt-2 { margin-top: 0.5rem; }

/* ── Password Strength ── */
.pwd-strength-section {
  margin-top: 0.5rem;
}

.pwd-bars-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 0.5rem;
}

.pwd-bar {
  height: 5px;
  flex: 1;
  border-radius: 3px;
  transition: background 0.3s;
}

.bar-empty  { background: #e2e8f0; }
.bar-weak   { background: #ef4444; }
.bar-fair   { background: #f59e0b; }
.bar-medium { background: #3b82f6; }
.bar-strong { background: #10b981; }

.pwd-strength-label {
  font-size: 0.72rem;
  font-weight: 700;
  white-space: nowrap;
}
.text-weak   { color: #ef4444; }
.text-fair   { color: #f59e0b; }
.text-medium { color: #3b82f6; }
.text-strong { color: #10b981; }

.pwd-rules-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 1rem;
}

.pwd-rules-list li {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: color 0.2s;
}

.pwd-rules-list li.rule-ok {
  color: #059669;
}

/* Password show/hide wrapper */
.pwd-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.pwd-input-wrap .form-input {
  padding-right: 2.75rem;
  width: 100%;
}

.pwd-eye-btn {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 0;
  display: flex;
  align-items: center;
  transition: color var(--transition-fast);
  flex-shrink: 0;
}

.pwd-eye-btn:hover {
  color: var(--primary);
}

.pwd-eye-btn svg {
  width: 18px;
  height: 18px;
}

/* Forgot Password */
.forgot-pwd-row {

  text-align: center;
  margin-top: 0.75rem;
}

.forgot-pwd-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 0.82rem;
  font-family: var(--font-family);
  font-weight: 600;
  cursor: pointer;
  transition: color var(--transition-fast);
  padding: 0;
}

.forgot-pwd-link:hover {
  color: var(--primary);
}

.forgot-modal-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.modal-desc {
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
  margin-bottom: 1.25rem;
}

.forgot-modal-steps {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  text-align: left;
  margin-bottom: 0.5rem;
}

.forgot-step {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-weight: 600;
}

.step-num {
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--secondary));
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

.mt-4 { margin-top: 1rem; }

</style>
