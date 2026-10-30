<template>
  <section class="admin-main glass-panel">
    <div class="main-header">
      <h3 aria-level="2">👥 {{ $t('admin.userList.title') }}</h3>
      <span class="user-count-badge">{{
        $t('admin.userList.count', { n: usersList.length })
      }}</span>
    </div>

    <div
      class="table-container mt-4"
      tabindex="0"
      role="region"
      :aria-label="$t('a11y.tableScroll', { title: $t('admin.userList.tableCaption') })"
    >
      <table class="admin-table">
        <caption class="sr-only">
          {{
            $t('admin.userList.tableCaption')
          }}
        </caption>
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
              <span v-if="user.username === authStore.currentUser?.username" class="me-tag">{{
                $t('admin.userList.me')
              }}</span>
            </td>
            <td>
              <!-- Dynamic Role Selector -->
              <select
                v-model="user.role"
                class="form-input table-select-input"
                :aria-label="$t('a11y.roleFor', { username: user.username })"
                :disabled="user.username === authStore.currentUser?.username"
                @change="updateUserRole(user.username, user.role)"
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
                  :aria-label="$t('a11y.restrictStudentFor', { username: user.username })"
                  :disabled="user.username === authStore.currentUser?.username"
                  @change="toggleRestriction(user.username, '/student')"
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
                  :aria-label="$t('a11y.restrictTeacherFor', { username: user.username })"
                  :disabled="user.username === authStore.currentUser?.username"
                  @change="toggleRestriction(user.username, '/teacher')"
                />
                <span class="checkmark"></span>
              </label>
            </td>
            <td>
              <button
                class="reset-pwd-btn"
                :disabled="user.username === authStore.currentUser?.username"
                :title="$t('admin.userList.colResetPwd')"
                @click="resetUserPassword(user.username)"
              >
                🔑
              </button>
            </td>
            <td>
              <button
                class="delete-btn"
                :disabled="user.username === authStore.currentUser?.username"
                @click="deleteUser(user.username)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useAuthStore, DEFAULT_RESET_PASSWORD } from '@/stores/auth'
import type { UserRole } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'

const { confirm, toast } = useToast()
const { t } = useI18n()
const authStore = useAuthStore()
const coursesStore = useCoursesStore()

// Transform db object into array
const usersList = computed(() => {
  return Object.keys(authStore.usersDb).map((username) => ({
    username,
    role: authStore.usersDb[username].role,
    realName: authStore.usersDb[username].realName,
    church: authStore.usersDb[username].church
  }))
})

function updateUserRole(username: string, newRole: UserRole) {
  const account = authStore.usersDb[username]
  if (!account) return
  if (account.role === 'student' && newRole !== 'student') authStore.unbindChildEverywhere(username)
  account.role = newRole
}

function toggleRestriction(username: string, page: string) {
  coursesStore.toggleRestriction(username, page)
}

async function deleteUser(username: string) {
  const ok = await confirm(t('admin.userList.deleteConfirm', { username }))
  if (ok) {
    authStore.unbindChildEverywhere(username)
    delete authStore.usersDb[username]
    // Clean up restrictions as well
    if (coursesStore.restrictionsDb[username]) {
      delete coursesStore.restrictionsDb[username]
    }
    toast(t('admin.userList.deletedToast', { username }), 'info')
  }
}

async function resetUserPassword(username: string) {
  const ok = await confirm(
    t('admin.userList.resetPwdConfirm', { username, pwd: DEFAULT_RESET_PASSWORD })
  )
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
</script>

<style scoped src="./admin-shared.css"></style>

<style scoped>
.admin-main {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
}

.avatar-student {
  background-color: var(--primary);
}
.avatar-admin {
  background-color: var(--info);
}

.me-tag {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
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
  background-color: #f1f5f9;
  border: 2px solid #cbd5e1;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.check-container:hover input ~ .checkmark {
  border-color: var(--danger);
  background-color: #fef2f2;
}

.check-container input:checked ~ .checkmark {
  background-color: var(--danger);
  border-color: var(--danger);
}

.checkmark:after {
  content: '';
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
  background-color: #fef3c7;
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
  background-color: #fee2e2;
}

.delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

/* ══════════════════════════════════════════
   AdminDashboard — Mobile RWD (640px)
══════════════════════════════════════════ */
@media (max-width: 640px) {
  /* Main area */
  .admin-main {
    padding: 1rem;
    border-radius: var(--radius-md);
  }
}

/* ══════════════════════════════════════════
   AdminDashboard — Mobile RWD (480px)
══════════════════════════════════════════ */
@media (max-width: 480px) {
  .admin-main {
    padding: 0.75rem;
  }
}
</style>
