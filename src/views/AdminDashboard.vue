<template>
  <div class="admin-dashboard container">
    <!-- Header banner -->
    <header class="dashboard-header glass-panel">
      <div class="admin-header-user-row">
        <div class="admin-avatar-wrap" @click="showProfileDialog = true" :title="$t('common.editProfileHint')">
          <img :src="authStore.currentUser?.avatarUrl" alt="avatar" class="admin-avatar-sm" />
          <span class="admin-role-badge">👑</span>
        </div>
        <div>
          <h2>{{ $t('admin.header.title') }}</h2>
          <p>{{ $t('admin.header.desc', { name: adminDisplayName }) }}</p>
          <p v-if="authStore.currentUser?.lastLoginAt" style="font-size:0.72rem;color:var(--text-muted);margin-top:2px;">🕐 {{ $t('admin.header.lastLogin', { time: authStore.currentUser?.lastLoginAt }) }}</p>
        </div>
      </div>
    </header>

    <!-- Profile Dialog -->
    <ProfileDialog v-model="showProfileDialog" />

    <div class="dashboard-body">
      <!-- Create New User Panel -->
      <section class="admin-sidebar glass-panel">
        <h3>➕ {{ $t('admin.createUser.title') }}</h3>
        <p class="section-desc mb-4">{{ $t('admin.createUser.desc') }}</p>

        <form @submit.prevent="createUser" class="create-form">
          <div class="form-group">
            <label class="form-label" for="new-username">{{ $t('admin.createUser.username') }}</label>
            <input 
              v-model="newUser.username" 
              id="new-username"
              type="text" 
              class="form-input" 
              :placeholder="$t('admin.createUser.usernamePlaceholder')" 
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-password">{{ $t('admin.createUser.password') }}</label>
            <input 
              v-model="newUser.password" 
              id="new-password"
              type="password" 
              class="form-input" 
              :placeholder="$t('admin.createUser.passwordPlaceholder')" 
              required
            />
          </div>
          <div class="form-group">
            <label class="form-label" for="new-role">{{ $t('admin.createUser.role') }}</label>
            <select v-model="newUser.role" id="new-role" class="form-input select-input">
              <option value="student">🎒 {{ $t('admin.roles.student') }}</option>
              <option value="teacher">👨‍🏫 {{ $t('admin.roles.teacher') }}</option>
              <option value="parent">👨‍👩‍👦 {{ $t('admin.roles.parent') }}</option>
              <option value="pastor">⛪ {{ $t('admin.roles.pastor') }}</option>
              <option value="admin">👑 {{ $t('admin.roles.admin') }}</option>
            </select>
          </div>
          
          <div class="form-group" v-if="newUser.role !== 'admin'">
            <label class="form-label" for="new-church">{{ $t('admin.createUser.church') }}</label>
            <select v-model="newUser.church" id="new-church" class="form-input select-input">
              <option v-for="church in CHURCHES" :key="church" :value="church">{{ church }}</option>
            </select>
          </div>
          
          <button type="submit" class="btn btn-secondary btn-block mt-4">
            {{ $t('admin.createUser.submit') }}
          </button>
        </form>

        <div v-if="alertMsg" :class="['alert-box mt-4', alertType]">
          {{ alertMsg }}
        </div>

      </section>

      <!-- Users Management Table -->
      <section class="admin-main glass-panel">
        <div class="main-header">
          <h3>👥 {{ $t('admin.userList.title') }}</h3>
          <span class="user-count-badge">{{ $t('admin.userList.count', { n: usersList.length }) }}</span>
        </div>

        <div class="table-container mt-4">
          <table class="admin-table">
            <thead>
              <tr>
                <th>{{ $t('admin.userList.colName') }}</th>
                <th>{{ $t('admin.userList.colRole') }}</th>
                <th>{{ $t('admin.userList.colRestrictStudent') }}</th>
                <th>{{ $t('admin.userList.colRestrictTeacher') }}</th>
                <th>{{ $t('admin.userList.colResetPwd') }}</th>
                <th>{{ $t('admin.userList.colDelete') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in usersList" :key="user.username">
                <td class="username-cell">
                  <span class="avatar-dot" :class="getAvatarClass(user.role)"></span>
                  <div class="admin-name-col">
                    <strong>{{ user.realName || user.username }}</strong>
                    <span v-if="user.realName" class="admin-id-tag">@{{ user.username }}</span>
                    <span v-if="user.church" class="admin-church-tag">{{ user.church }}</span>
                  </div>
                  <span v-if="user.username === authStore.currentUser?.username" class="me-tag">{{ $t('admin.userList.me') }}</span>
                </td>
                <td>
                  <!-- Dynamic Role Selector -->
                  <select 
                    v-model="user.role" 
                    @change="updateUserRole(user.username, user.role)"
                    class="form-input table-select-input"
                    :disabled="user.username === authStore.currentUser?.username"
                  >
                    <option value="student">🎒 {{ $t('admin.roles.student') }}</option>
                    <option value="teacher">👨‍🏫 {{ $t('admin.roles.teacher') }}</option>
                    <option value="parent">👨‍👩‍👦 {{ $t('admin.roles.parent') }}</option>
                    <option value="pastor">⛪ {{ $t('admin.roles.pastor') }}</option>
                    <option value="admin">👑 {{ $t('admin.roles.admin') }}</option>
                  </select>
                </td>
                <td class="text-center">
                  <!-- Checkbox to restrict student dashboard -->
                  <label class="check-container">
                    <input 
                      type="checkbox"
                      :checked="coursesStore.isPageRestricted(user.username, '/student')"
                      @change="toggleRestriction(user.username, '/student')"
                      :disabled="user.username === authStore.currentUser?.username"
                    />
                    <span class="checkmark"></span>
                  </label>
                </td>
                <td class="text-center">
                  <!-- Checkbox to restrict teacher dashboard -->
                  <label class="check-container">
                    <input 
                      type="checkbox"
                      :checked="coursesStore.isPageRestricted(user.username, '/teacher')"
                      @change="toggleRestriction(user.username, '/teacher')"
                      :disabled="user.username === authStore.currentUser?.username"
                    />
                    <span class="checkmark"></span>
                  </label>
                </td>
                <td>
                  <button
                    @click="resetUserPassword(user.username)"
                    class="reset-pwd-btn"
                    :disabled="user.username === authStore.currentUser?.username"
                    :title="$t('admin.userList.colResetPwd')"
                  >
                    🔑
                  </button>
                </td>
                <td>
                  <button 
                    @click="deleteUser(user.username)"
                    class="delete-btn"
                    :disabled="user.username === authStore.currentUser?.username"
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <!-- Church Statistics Overview Panel - Card Grid Style -->
    <section class="church-overview-panel glass-panel mt-4">
      <div class="main-header">
        <h3>⛪ 各教會概況總覽</h3>
        <span class="user-count-badge">共 {{ churchSummaries.length }} 間教會</span>
      </div>
      <!-- Card Grid -->
      <div class="church-cards-grid mt-4">
        <div 
          v-for="summary in churchSummaries" 
          :key="summary.church"
          class="church-card"
          :class="{ 'church-card-expanded': expandedChurch === summary.church }"
        >
          <!-- Card Header -->
          <div class="church-card-header">
            <div class="church-card-icon">⛪</div>
            <div class="church-card-title-block">
              <h4 class="church-card-name">{{ summary.church }}</h4>
            </div>
          </div>

          <!-- Stats Row -->
          <div class="church-card-stats">
            <div class="church-stat-item">
              <span class="church-stat-val">{{ summary.teacherCount }}</span>
              <span class="church-stat-lbl">👨‍🏫 輔導教師</span>
            </div>
            <div class="church-stat-divider"></div>
            <div class="church-stat-item">
              <span class="church-stat-val">{{ summary.studentCount }}</span>
              <span class="church-stat-lbl">🎒 SS學員</span>
            </div>
          </div>

          <!-- View button -->
          <button 
            class="church-card-btn"
            :class="{ active: expandedChurch === summary.church }"
            @click="toggleChurchExpand(summary.church)"
          >
            {{ expandedChurch === summary.church ? '▲ 收起詳情' : '▼ 查看詳情' }}
          </button>

          <!-- Expanded Detail -->
          <div v-if="expandedChurch === summary.church" class="church-card-detail">
            <!-- Teachers -->
            <div class="church-detail-section">
              <div class="church-detail-label">👨‍🏫 輔導教師清單</div>
              <div class="church-chips-row">
                <span 
                  v-for="t in getChurchTeacherList(summary.church)" 
                  :key="t" 
                  class="church-chip chip-teacher"
                  :title="`帳號：${t}`"
                >✍️ {{ authStore.usersDb[t]?.realName || t }}</span>
                <span v-if="getChurchTeacherList(summary.church).length === 0" class="chip-empty">尚無輔導教師</span>
              </div>
            </div>
            <!-- Students -->
            <div class="church-detail-section mt-2">
              <div class="church-detail-label">🎒 SS 學員清單</div>
              <div class="church-chips-row">
                <span 
                  v-for="std in getChurchStudentList(summary.church)" 
                  :key="std" 
                  class="church-chip chip-student"
                  :title="`帳號：${std}`"
                >🎒 {{ authStore.usersDb[std]?.realName || std }}</span>
                <span v-if="getChurchStudentList(summary.church).length === 0" class="chip-empty">尚無 SS 學員</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="churchSummaries.length === 0" class="church-empty-state">
          <div>🏛️</div>
          <p>目前尚無教會資料</p>
        </div>
      </div>
    </section>

    <!-- Annual Teaching Stats Overview — SS Central only -->
    <section class="admin-stats-overview glass-panel mt-4">
      <div class="main-header">
        <h3>📊 年度教師教學人次統計總覽</h3>
        <div class="stats-header-controls">
          <select v-model="adminStatsYear" class="form-input select-input" style="min-width:120px;">
            <option v-for="y in adminAvailableYears" :key="y" :value="y">{{ y }} 年度</option>
          </select>
          <span class="user-count-badge">共 {{ adminTeachingStats.length }} 筆</span>
        </div>
      </div>

      <div class="table-container mt-4">
        <table class="admin-table stats-table">
          <thead>
            <tr>
              <th>教師姓名</th>
              <th>所屬教會</th>
              <th>講師資料庫</th>
              <th>1對1<br/>三十個論</th>
              <th>1對多<br/>三十個論</th>
              <th>1對1<br/>閃耀計畫</th>
              <th>1對多<br/>閃耀計畫</th>
              <th>合計人次</th>
              <th>最後更新</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in adminTeachingStats" :key="row.teacherUsername">
              <td class="username-cell">
                <span class="avatar-dot" :class="getAvatarClass('teacher')"></span>
                <div class="admin-name-col">
                  <strong>{{ authStore.usersDb[row.teacherUsername]?.realName || row.teacherUsername }}</strong>
                  <span v-if="authStore.usersDb[row.teacherUsername]?.realName" class="admin-id-tag">
                    @{{ row.teacherUsername }}
                  </span>
                </div>
              </td>
              <td>
                <span class="admin-church-tag" style="font-size:0.78rem;">{{ row.church || '—' }}</span>
              </td>
              <td class="text-center">
                <!-- Linked lecturer info -->
                <template v-if="getLinkedLecturer(row.teacherUsername)">
                  <div class="linked-lec-cell">
                    <span class="linked-lec-name">{{ getLinkedLecturer(row.teacherUsername)?.name }}</span>
                    <span class="lec-course-count">{{ getLinkedLecturer(row.teacherUsername)?.courseIds.length }} 堂</span>
                  </div>
                </template>
                <span v-else class="text-xs text-muted">未建立</span>
              </td>
              <td class="text-center">
                <span class="stat-num">{{ row.oneOnOne30 }}</span>
              </td>
              <td class="text-center">
                <span class="stat-num">{{ row.oneToMany30 }}</span>
              </td>
              <td class="text-center">
                <span class="stat-num">{{ row.oneOnOneShining }}</span>
              </td>
              <td class="text-center">
                <span class="stat-num">{{ row.oneToManyShining }}</span>
              </td>
              <td class="text-center">
                <span class="badge badge-total">
                  {{ row.oneOnOne30 + row.oneToMany30 + row.oneOnOneShining + row.oneToManyShining }}
                </span>
              </td>
              <td class="text-xs text-muted">{{ row.submittedAt || '—' }}</td>
            </tr>
            <tr v-if="adminTeachingStats.length === 0">
              <td colspan="9" class="text-center empty-row">
                {{ adminStatsYear }} 年度尚未有任何教師填寫申報資料
              </td>
            </tr>
            <!-- Grand Total Row -->
            <tr v-if="adminTeachingStats.length > 0" class="stats-grand-total-row">
              <td colspan="3"><strong>📊 全體合計</strong></td>
              <td class="text-center"><strong>{{ adminStatsTotals.oneOnOne30 }}</strong></td>
              <td class="text-center"><strong>{{ adminStatsTotals.oneToMany30 }}</strong></td>
              <td class="text-center"><strong>{{ adminStatsTotals.oneOnOneShining }}</strong></td>
              <td class="text-center"><strong>{{ adminStatsTotals.oneToManyShining }}</strong></td>
              <td class="text-center">
                <span class="badge badge-total" style="background: var(--primary); color: white; font-size:0.9rem;">
                  {{ adminStatsTotals.total }}
                </span>
              </td>
              <td></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ─── Invite Code Management ─── -->
    <section class="admin-section glass-panel mt-6">
      <div class="section-header">
        <h3>🎟️ 邀請碼管理</h3>
        <p class="section-desc">產生適用特定角色的一次性邀請碼，發給被邀請者完成註冊。</p>
      </div>

      <!-- Generate Form -->
      <div class="invite-generate-bar glass-card">
        <div class="invite-generate-fields">
          <div class="form-group">
            <label class="form-label">角色</label>
            <select v-model="inviteForm.role" class="form-input select-input" id="invite-role-select">
              <option value="student">🎒 SS 學員</option>
              <option value="teacher">👨‍🏫 輔導教師</option>
              <option value="pastor">⛪ 分區牧者</option>
              <option value="parent">👨‍👩‍👦 關懷家長</option>
              <option value="admin">👑 SS 中央</option>
            </select>
          </div>
          <div class="form-group" v-if="inviteForm.role !== 'admin'">
            <label class="form-label">指定教會</label>
            <select v-model="inviteForm.church" class="form-input select-input" id="invite-church-select">
              <option v-for="c in CHURCHES" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">有效天數</label>
            <select v-model="inviteForm.expiryDays" class="form-input select-input" id="invite-expiry-select">
              <option :value="3">3 天</option>
              <option :value="7">7 天</option>
              <option :value="14">14 天</option>
              <option :value="30">30 天</option>
            </select>
          </div>
        </div>
        <button class="btn btn-primary" @click="generateInviteCode" id="btn-generate-invite">
          ✨ 產生邀請碼
        </button>

        <!-- Generated Code Display -->
        <div v-if="lastGeneratedCode" class="generated-code-display">
          <span class="generated-code-text">{{ lastGeneratedCode }}</span>
          <button class="btn btn-outline btn-sm" @click="copyInviteCode(lastGeneratedCode)" id="btn-copy-invite">
            📋 複製
          </button>
        </div>
      </div>

      <!-- Invite Codes List -->
      <div class="invite-list mt-4">
        <div v-if="allInviteCodes.length === 0" class="text-center text-muted py-4">
          目前尚無邀請碼。
        </div>
        <table v-else class="invite-table">
          <thead>
            <tr>
              <th>邀請碼</th>
              <th>角色</th>
              <th>教會</th>
              <th>到期日</th>
              <th>狀態</th>
              <th>作廢</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="code in allInviteCodes" :key="code.code" :class="inviteRowClass(code)">
              <td><code class="invite-code-cell">{{ code.code }}</code></td>
              <td>{{ inviteRoleLabel(code.role) }}</td>
              <td>{{ code.church || '—' }}</td>
              <td>{{ formatInviteDate(code.expiresAt) }}</td>
              <td><span :class="['invite-status-badge', inviteStatusClass(code)]">{{ inviteStatusLabel(code) }}</span></td>
              <td>
                <button
                  v-if="!code.usedBy && !code.revoked"
                  class="btn btn-danger btn-sm"
                  @click="revokeCode(code.code)"
                >作廢</button>
                <span v-else class="text-muted" style="font-size:0.75rem;">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
const { confirm, toast } = useToast()
const { t } = useI18n()
import { useAuthStore, CHURCHES, DEFAULT_RESET_PASSWORD } from '@/stores/auth'
import { defineAsyncComponent } from 'vue'
import type { UserRole, InviteCode } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'

// 大型 Dialog 元件：按需載入
const ProfileDialog = defineAsyncComponent(() => import('@/components/ProfileDialog.vue'))

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

const showProfileDialog = ref(false)

const adminDisplayName = computed(() => {
  const u = authStore.currentUser
  return u?.displayName || u?.username || ''
})

const newUser = reactive({
  username: '',
  password: '',
  role: 'student' as UserRole,
  church: '愛與話語'
})

const alertMsg = ref('')
const alertType = ref<'success' | 'error'>('success')

// ── Invite Code State ──────────────────────────────────────────────────────────────

const inviteForm = reactive({
  role: 'teacher' as UserRole,
  church: '愛與話語',
  expiryDays: 7
})
const lastGeneratedCode = ref('')

const allInviteCodes = computed(() => authStore.getInviteCodes())

function generateInviteCode() {
  const me = authStore.currentUser
  if (!me) return
  const church = inviteForm.role !== 'admin' ? inviteForm.church : undefined
  const code = authStore.generateInviteCode(inviteForm.role, church, me.username, inviteForm.expiryDays)
  lastGeneratedCode.value = code
  toast(`邀請碼 ${code} 已產生！`, 'success')
}

async function revokeCode(code: string) {
  const ok = await confirm(`確定要作廢邀請碼 ${code} 嗎？`)
  if (!ok) return
  const result = authStore.revokeInviteCode(code)
  toast(result.message, result.success ? 'success' : 'error')
}

function copyInviteCode(code: string) {
  navigator.clipboard.writeText(code).then(() => {
    toast('已複製邀請碼！', 'success')
  }).catch(() => {
    toast(`請手動複製：${code}`, 'info')
  })
}

const INVITE_ROLE_LABELS: Record<UserRole, string> = {
  student: '🎒 學員',
  teacher: '👨‍🏫 輔導教師',
  pastor: '⛪ 牧者',
  parent: '👨‍👩‍👦 家長',
  admin: '👑 中央'
}

function inviteRoleLabel(role: UserRole): string {
  return INVITE_ROLE_LABELS[role] || role
}

function formatInviteDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function inviteStatusLabel(code: InviteCode): string {
  if (code.revoked) return '已作廢'
  if (code.usedBy) return `已使用 (${code.usedBy})`
  if (new Date() > new Date(code.expiresAt)) return '已過期'
  return '有效'
}

function inviteStatusClass(code: InviteCode): string {
  if (code.revoked || new Date() > new Date(code.expiresAt)) return 'status-revoked'
  if (code.usedBy) return 'status-used'
  return 'status-active'
}

function inviteRowClass(code: InviteCode): string {
  if (code.revoked || new Date() > new Date(code.expiresAt)) return 'row-inactive'
  if (code.usedBy) return 'row-used'
  return ''
}

// Transform db object into array
const usersList = computed(() => {
  return Object.keys(authStore.usersDb).map(username => ({
    username,
    role: authStore.usersDb[username].role,
    realName: authStore.usersDb[username].realName,
    church: authStore.usersDb[username].church
  }))
})


// ── Teaching Stats Overview ──
const adminCurrentYear = new Date().getFullYear()
const adminAvailableYears = Array.from({ length: 5 }, (_, i) => adminCurrentYear - i)
const adminStatsYear = ref(adminCurrentYear)

const adminTeachingStats = computed(() => {
  return coursesStore.getAllTeachingStats(adminStatsYear.value)
    .sort((a, b) => {
      // Sort by church, then teacher
      const churchDiff = (a.church || '').localeCompare(b.church || '', 'zh-TW')
      if (churchDiff !== 0) return churchDiff
      return a.teacherUsername.localeCompare(b.teacherUsername)
    })
})

const adminStatsTotals = computed(() => {
  const rows = adminTeachingStats.value
  return {
    oneOnOne30: rows.reduce((s, r) => s + r.oneOnOne30, 0),
    oneToMany30: rows.reduce((s, r) => s + r.oneToMany30, 0),
    oneOnOneShining: rows.reduce((s, r) => s + r.oneOnOneShining, 0),
    oneToManyShining: rows.reduce((s, r) => s + r.oneToManyShining, 0),
    total: rows.reduce((s, r) => s + r.oneOnOne30 + r.oneToMany30 + r.oneOnOneShining + r.oneToManyShining, 0)
  }
})

/**
 * 根據 teacherUsername 查找對應的講師資料庫紀錄
 * 用於統計總覽表顯示「講師資料庫」欄位
 */
function getLinkedLecturer(teacherUsername: string) {
  return coursesStore.getLecturerByUsername(teacherUsername)
}

function showAlert(msg: string, type: 'success' | 'error' = 'success') {
  alertMsg.value = msg
  alertType.value = type
  setTimeout(() => {
    alertMsg.value = ''
  }, 4000)
}



function createUser() {
  if (!newUser.username || !newUser.password) {
    showAlert(t('auth.validation.fillAll'), 'error')
    return
  }
  
  if (authStore.usersDb[newUser.username]) {
    showAlert(t('admin.createUser.usernameTaken'), 'error')
    return
  }

  authStore.usersDb[newUser.username] = {
    passwordHash: newUser.password,
    role: newUser.role,
    church: newUser.role !== 'admin' ? newUser.church : undefined
  }

  showAlert(t('admin.createUser.successMsg', { username: newUser.username }), 'success')
  newUser.username = ''
  newUser.password = ''
  newUser.role = 'student'
  newUser.church = '愛與話語'
}

function updateUserRole(username: string, newRole: UserRole) {
  if (authStore.usersDb[username]) {
    authStore.usersDb[username].role = newRole
  }
}

function toggleRestriction(username: string, page: string) {
  coursesStore.toggleRestriction(username, page)
}

async function deleteUser(username: string) {
  const ok = await confirm(t('admin.userList.deleteConfirm', { username }))
  if (ok) {
    delete authStore.usersDb[username]
    // Clean up restrictions as well
    if (coursesStore.restrictionsDb[username]) {
      delete coursesStore.restrictionsDb[username]
    }
    toast(t('admin.userList.deletedToast', { username }), 'info')
  }
}

async function resetUserPassword(username: string) {
  const ok = await confirm(t('admin.userList.resetPwdConfirm', { username, pwd: DEFAULT_RESET_PASSWORD }))
  if (!ok) return
  const result = authStore.adminResetPassword(username)
  if (result.success) {
    toast(t('admin.userList.resetPwdSuccess', { username, pwd: DEFAULT_RESET_PASSWORD }), 'success')
  } else {
    toast(result.message, 'error')
  }
}

function getAvatarClass(role: UserRole) {
  if (role === 'admin') return 'avatar-admin'
  if (role === 'teacher' || role === 'pastor') return 'avatar-teacher'
  return 'avatar-student'
}

// Church-based computed properties and helpers
const churchSummaries = computed(() => {
  return coursesStore.getChurchSummaries(authStore.usersDb)
})

const expandedChurch = ref<string | null>(null)

function toggleChurchExpand(church: string) {
  expandedChurch.value = expandedChurch.value === church ? null : church
}

function getChurchStudentList(church: string): string[] {
  return coursesStore.getStudentsByChurch(authStore.usersDb, church)
}

function getChurchTeacherList(church: string): string[] {
  return coursesStore.getTeachersByChurch(authStore.usersDb, church)
}
</script>

<style scoped>
.dashboard-header {
  padding: 2rem;
  margin-bottom: 2rem;
}

.admin-header-user-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.admin-avatar-wrap {
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}
.admin-avatar-sm {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(99,102,241,0.3);
  object-fit: cover;
  transition: opacity 0.2s;
}
.admin-avatar-wrap:hover .admin-avatar-sm { opacity: 0.8; }
.admin-role-badge {
  position: absolute;
  bottom: -3px;
  right: -3px;
  background: white;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}


.dashboard-body {
  display: grid;
  grid-template-columns: 0.7fr 1.3fr;
  gap: 2rem;
}

@media (max-width: 900px) {
  .dashboard-body {
    grid-template-columns: 1fr;
  }
}

.admin-sidebar {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  align-self: start;
}

.section-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.select-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1.2em;
  padding-right: 2.5rem;
}

.btn-block {
  width: 100%;
}

.admin-main {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #E2E8F0;
  padding-bottom: 1rem;
}

.user-count-badge {
  background: #EFF6FF;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
}

/* Table */
.table-container {
  overflow-x: auto;
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.admin-table th {
  padding: 0.75rem 1rem;
  color: var(--text-secondary);
  font-weight: 700;
  border-bottom: 2px solid #E2E8F0;
  font-size: 0.9rem;
}

.admin-table td {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid #E2E8F0;
  vertical-align: middle;
  font-size: 0.9rem;
}

.username-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* Admin name column with real name + ID tag + church */
.admin-name-col {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.admin-id-tag {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.admin-church-tag {
  font-size: 0.65rem;
  color: var(--text-muted);
  background: rgba(99, 102, 241, 0.07);
  border-radius: 4px;
  padding: 1px 5px;
  display: inline-block;
  width: fit-content;
}


.avatar-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.avatar-student { background-color: var(--primary); }
.avatar-teacher { background-color: var(--secondary); }
.avatar-admin { background-color: var(--info); }

.me-tag {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}

/* ─── Admin Teaching Stats Overview ─── */
.admin-stats-overview {
  padding: 2rem;
}

.stats-header-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.stats-table th {
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.3;
  white-space: nowrap;
}

.stats-table th:first-child,
.stats-table th:nth-child(2) {
  text-align: left;
}

.stat-num {
  font-weight: 700;
  font-size: 1rem;
  color: var(--text-primary);
}

.badge-total {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  font-weight: 700;
  font-size: 0.85rem;
}

.stats-grand-total-row td {
  background: rgba(99, 102, 241, 0.05);
  border-top: 2px solid rgba(99, 102, 241, 0.2);
  font-weight: 600;
}

/* Linked lecturer cell in admin stats table */
.linked-lec-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.linked-lec-name {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-primary);
}

.lec-course-count {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: 20px;
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.table-select-input {
  padding: 0.35rem 0.75rem;
  font-size: 0.85rem;
  width: auto;
  border-radius: var(--radius-sm);
  cursor: pointer;
}

/* Custom Checkbox */
.check-container {
  display: inline-block;
  position: relative;
  cursor: pointer;
  font-size: 22px;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  width: 22px;
  height: 22px;
}

.check-container input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 20px;
  width: 20px;
  background-color: #F1F5F9;
  border: 2px solid #CBD5E1;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.check-container:hover input ~ .checkmark {
  border-color: var(--danger);
  background-color: #FEF2F2;
}

.check-container input:checked ~ .checkmark {
  background-color: var(--danger);
  border-color: var(--danger);
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
}

.check-container input:checked ~ .checkmark:after {
  display: block;
}

.check-container .checkmark:after {
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  -webkit-transform: rotate(45deg);
  -ms-transform: rotate(45deg);
  transform: rotate(45deg);
}

.reset-pwd-btn {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.reset-pwd-btn:hover:not(:disabled) {
  background-color: #FEF3C7;
}

.reset-pwd-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.delete-btn {

  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.delete-btn:hover:not(:disabled) {
  background-color: #FEE2E2;
}

.delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* Alert styles */
.alert-box {
  padding: 0.6rem 1rem;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
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

/* Match Table styling */
.border-t {
  border-top: 1px dashed #E2E8F0;
}

.match-list-panel h3 {
  font-size: 1.1rem;
  margin-bottom: 0.25rem;
}

.match-table-wrapper {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #E2E8F0;
  border-radius: var(--radius-sm);
  background-color: #F8FAFC;
}

.match-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
}

.match-table th {
  background-color: #F1F5F9;
  padding: 0.5rem;
  font-weight: 700;
  border-bottom: 1px solid #E2E8F0;
  text-align: left;
}

.match-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #E2E8F0;
}

/* Church Overview - Card Grid */
.church-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.church-card {
  border-radius: 14px;
  border: 1.5px solid #E2E8F0;
  background: white;
  overflow: hidden;
  transition: box-shadow 0.2s, border-color 0.2s;
  display: flex;
  flex-direction: column;
}

.church-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  border-color: #C7D2FE;
}

.church-card-expanded {
  border-color: #6366F1;
  box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
}

.church-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, #EEF2FF 0%, #F8FAFC 100%);
  border-bottom: 1px solid #E2E8F0;
}

.church-card-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.church-card-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #1e293b;
}

.church-card-stats {
  display: flex;
  align-items: center;
  padding: 0.85rem 1.25rem;
  gap: 0;
}

.church-stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
}

.church-stat-val {
  font-size: 1.6rem;
  font-weight: 800;
  color: #6366F1;
  line-height: 1;
}

.church-stat-lbl {
  font-size: 0.72rem;
  color: #64748B;
  font-weight: 600;
  text-align: center;
}

.church-stat-divider {
  width: 1px;
  height: 36px;
  background: #E2E8F0;
  margin: 0 0.5rem;
}

.church-card-btn {
  width: 100%;
  padding: 0.6rem;
  border: none;
  border-top: 1px solid #E2E8F0;
  background: #F8FAFC;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  color: #6366F1;
  cursor: pointer;
  transition: background 0.15s;
}

.church-card-btn:hover {
  background: #EEF2FF;
}

.church-card-btn.active {
  background: #EEF2FF;
  color: #4F46E5;
}

.church-card-detail {
  padding: 0.85rem 1.25rem 1rem;
  background: #FAFBFF;
  border-top: 1px dashed #E2E8F0;
}

.church-detail-section { }
.church-detail-section.mt-2 { margin-top: 0.65rem; }

.church-detail-label {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.church-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.church-chip {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
}

.chip-teacher {
  background: rgba(16, 185, 129, 0.1);
  color: #059669;
  border: 1px solid #A7F3D0;
}

.chip-student {
  background: rgba(99, 102, 241, 0.08);
  color: #4F46E5;
  border: 1px solid #C7D2FE;
}

.chip-empty {
  font-size: 0.75rem;
  color: #94A3B8;
  font-style: italic;
}

.church-empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
  color: #94A3B8;
  font-size: 2rem;
}

.church-empty-state p {
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.select-input {
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 1rem center;
  background-size: 1.2em;
  padding-right: 2.5rem;
}

.empty-row {
  color: var(--text-muted);
  padding: 2rem;
  font-style: italic;
  font-size: 0.9rem;
}

.mt-4 { margin-top: 1rem; }
.mt-6 { margin-top: 1.5rem; }

/* Invite Code Management */
.admin-section {
  padding: 1.5rem;
}

.section-header {
  margin-bottom: 1rem;
}

.section-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.section-desc {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.invite-generate-bar {
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.invite-generate-fields {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.invite-generate-fields .form-group {
  flex: 1;
  min-width: 120px;
  margin-bottom: 0;
}

.generated-code-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: var(--radius-sm);
  background: rgba(99, 102, 241, 0.08);
  border: 1px dashed rgba(99, 102, 241, 0.4);
}

.generated-code-text {
  font-family: 'Courier New', monospace;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--primary);
  flex: 1;
}

.invite-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.invite-table th,
.invite-table td {
  padding: 0.6rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid rgba(99, 102, 241, 0.08);
}

.invite-table th {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.invite-code-cell {
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--primary);
}

.invite-status-badge {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.status-active {
  background: rgba(5, 150, 105, 0.12);
  color: #059669;
  border: 1px solid rgba(5, 150, 105, 0.3);
}

.status-used {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border: 1px solid rgba(99, 102, 241, 0.25);
}

.status-revoked {
  background: rgba(107, 114, 128, 0.1);
  color: var(--text-muted);
  border: 1px solid rgba(107, 114, 128, 0.2);
}

.row-inactive td {
  opacity: 0.45;
}

.row-used td {
  opacity: 0.7;
}


/* ══════════════════════════════════════════
   AdminDashboard — Mobile RWD (640px)
══════════════════════════════════════════ */
@media (max-width: 640px) {
  /* Dashboard body: single column */
  .dashboard-body {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  /* Sidebar compact */
  .admin-sidebar {
    padding: 1rem;
    border-radius: var(--radius-md);
  }

  /* Main area */
  .admin-main {
    padding: 1rem;
    border-radius: var(--radius-md);
  }

  /* Main header */
  .main-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  /* Tab navigation */
  .main-tabs {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
    gap: 0.25rem;
    padding: 0.25rem;
  }

  .main-tab-btn {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 0.82rem;
    padding: 0.6rem 0.85rem;
  }

  /* Table: scrollable */
  .table-container {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  /* Inner tab selectors */
  .tab-selectors {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    flex-wrap: nowrap;
  }

  .tab-btn {
    flex: 0 0 auto;
    white-space: nowrap;
    font-size: 0.78rem;
    padding: 0.35rem 0.75rem;
  }

  /* Glass panels */
  .glass-panel {
    padding: 1rem !important;
  }

  /* Panel header rows */
  .panel-header-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

/* ══════════════════════════════════════════
   AdminDashboard — Mobile RWD (480px)
══════════════════════════════════════════ */
@media (max-width: 480px) {
  .admin-sidebar {
    padding: 0.75rem;
  }

  .admin-main {
    padding: 0.75rem;
  }

  .main-tab-btn {
    padding: 0.5rem 0.65rem;
    font-size: 0.78rem;
  }

  /* User table compact */
  .users-table th,
  .users-table td {
    font-size: 0.72rem;
    padding: 0.4rem 0.4rem;
    white-space: nowrap;
  }

  /* Stats grid */
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.75rem;
  }

  /* Overview cards */
  .overview-card {
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Section buttons */
  .section-actions {
    flex-direction: column;
    gap: 0.5rem;
  }

  .section-actions .btn {
    width: 100%;
    justify-content: center;
  }

  /* Form groups */
  .form-row-inline {
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-row-inline .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
