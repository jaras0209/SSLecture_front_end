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
            <th>{{ $t('admin.userList.colRole') }} / {{ $t('gender.label') }}</th>
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
                <span v-if="user.socialLogin" class="admin-id-tag social-login-tag">{{
                  $t('admin.userList.signsInWith', { method: user.socialLogin })
                }}</span>
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
              <GenderSelect
                v-if="authStore.hasGender(user.username)"
                :username="user.username"
                class="table-select-input mt-1"
              />
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
              <!-- Google / LINE accounts have no password to reset -->
              <button
                class="reset-pwd-btn"
                :disabled="user.username === authStore.currentUser?.username || !!user.socialLogin"
                :title="
                  user.socialLogin
                    ? $t('admin.userList.noPasswordToReset', { method: user.socialLogin })
                    : $t('admin.userList.colResetPwd')
                "
                :aria-label="$t('a11y.resetPasswordFor', { username: user.username })"
                @click="resetUserPassword(user.username)"
              >
                🔑
              </button>
            </td>
            <td>
              <button
                class="delete-btn"
                :disabled="user.username === authStore.currentUser?.username"
                :aria-label="$t('a11y.deleteUser', { username: user.username })"
                @click="deleteUser(user.username)"
              >
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- The new temporary password: stays up until the admin has passed it on -->
    <div v-if="resetResult" class="modal-overlay" @click.self="resetResult = null">
      <div
        v-dialog="() => (resetResult = null)"
        class="modal-card reset-result"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-result-title"
        aria-describedby="reset-result-desc"
      >
        <h3 id="reset-result-title" aria-level="2">
          {{ $t('admin.userList.resetDialog.title', { username: resetResult.username }) }}
        </h3>
        <p id="reset-result-desc" class="text-sm text-muted">
          {{ $t('admin.userList.resetDialog.desc') }}
        </p>
        <p id="reset-result-label" class="form-label mt-4">
          {{ $t('admin.userList.resetDialog.label') }}
        </p>
        <output class="temp-password" aria-labelledby="reset-result-label">{{
          resetResult.password
        }}</output>
        <div class="reset-result-actions mt-4">
          <button type="button" class="btn btn-outline" @click="copyTempPassword">
            📋 {{ $t('admin.userList.resetDialog.copy') }}
          </button>
          <button type="button" class="btn btn-primary" autofocus @click="resetResult = null">
            {{ $t('admin.userList.resetDialog.done') }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useAccountCleanup, type ReleaseSummary } from '@/composables/useAccountCleanup'
import GenderSelect from '@/components/shared/GenderSelect.vue'
import { computed, ref } from 'vue'
import { vDialog } from '@/directives/dialog'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import type { UserRole } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { usesBackend } from '@/utils/backendMode'

const { confirm, toast } = useToast()
const { t } = useI18n()
const authStore = useAuthStore()
const { releaseRole } = useAccountCleanup()
const coursesStore = useCoursesStore()

// Transform db object into array
/** Shown next to accounts that sign in with Google / LINE instead of a password */
const SOCIAL_LOGIN_NAMES: Record<string, string | undefined> = { google: 'Google', line: 'LINE' }

const usersList = computed(() => {
  return Object.keys(authStore.usersDb).map((username) => ({
    username,
    role: authStore.usersDb[username].role,
    realName: authStore.usersDb[username].realName,
    church: authStore.usersDb[username].church,
    socialLogin: SOCIAL_LOGIN_NAMES[authStore.usersDb[username].loginMethod ?? 'credentials']
  }))
})

/** With the backend (utils/backendMode.ts) the server changes and cleans up accounts */
const backend = usesBackend()

async function updateUserRole(username: string, newRole: UserRole) {
  const account = authStore.usersDb[username]
  if (!account || account.role === newRole) return
  if (backend) {
    const result = await authStore.adminUpdateAccount(username, { role: newRole })
    if (result.cleanup) reportCleanup(result.cleanup)
    // Refused: show the role the server still has
    if (!result.success) {
      toast(result.message, 'error')
      void authStore.loadAccounts()
    }
    return
  }
  reportCleanup(releaseRole(username, account.role, 'roleChanged', newRole))
  account.role = newRole
}

/** Tell the admin what else was cleaned up, if anything */
function reportCleanup(s: ReleaseSummary) {
  if (s.mentorAssignments + s.lecturerLinks + s.cancelledBookings === 0) return
  toast(
    t('admin.cleanup.summary', {
      mentors: s.mentorAssignments,
      lecturers: s.lecturerLinks,
      bookings: s.cancelledBookings
    }),
    'info',
    6000
  )
}

function toggleRestriction(username: string, page: string) {
  coursesStore.toggleRestriction(username, page)
}

async function deleteUser(username: string) {
  const ok = await confirm(t('admin.userList.deleteConfirm', { username }))
  if (ok && backend) {
    const result = await authStore.adminDeleteAccount(username)
    if (!result.success) return toast(result.message, 'error')
    toast(t('admin.userList.deletedToast', { username }), 'info')
    if (result.cleanup) reportCleanup(result.cleanup)
    return
  }
  if (ok) {
    const role = authStore.usersDb[username]?.role
    const summary = role ? releaseRole(username, role, 'deleted') : undefined
    authStore.deleteAccount(username)
    // Clean up restrictions as well
    if (coursesStore.restrictionsDb[username]) {
      delete coursesStore.restrictionsDb[username]
    }
    toast(t('admin.userList.deletedToast', { username }), 'info')
    if (summary) reportCleanup(summary)
  }
}

/** The account whose password was just reset, and its temporary password (shown once) */
const resetResult = ref<{ username: string; password: string } | null>(null)

async function resetUserPassword(username: string) {
  const ok = await confirm(t('admin.userList.resetPwdConfirm', { username }))
  if (!ok) return
  const result = backend
    ? await authStore.adminResetPasswordOnServer(username)
    : authStore.adminResetPassword(username)
  if (result.success && result.password) {
    resetResult.value = { username, password: result.password }
  } else {
    toast(result.message, 'error')
  }
}

function copyTempPassword() {
  if (!resetResult.value) return
  // No clipboard (an older browser, or a page not served over HTTPS): it stays on screen
  const write =
    navigator.clipboard?.writeText(resetResult.value.password) ??
    Promise.reject(new Error('no clipboard'))
  write
    .then(() => toast(t('admin.userList.resetDialog.copied'), 'info'))
    .catch(() => toast(t('admin.userList.resetDialog.copyFallback'), 'info'))
}

function getAvatarClass(role: UserRole) {
  if (role === 'admin') return 'avatar-admin'
  if (role === 'teacher' || role === 'pastor') return 'avatar-teacher'
  return 'avatar-student'
}
</script>

<style scoped src="./admin-shared.css"></style>

<style scoped>
.reset-result h3 {
  margin: 0 0 0.5rem;
}

/* Large, monospaced and selectable in one go, to read out or copy by hand */
.temp-password {
  display: block;
  padding: 0.75rem 1rem;
  border: 1px dashed var(--primary);
  border-radius: var(--radius-sm);
  background: #eff6ff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 1.5rem;
  letter-spacing: 0.12em;
  text-align: center;
  user-select: all;
}

.reset-result-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
}

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
