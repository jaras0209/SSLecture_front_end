<template>
  <section class="admin-section glass-panel mt-6">
    <div class="section-header">
      <h3 aria-level="2">{{ $t('admin.inviteCode.title') }}</h3>
      <p class="section-desc">{{ $t('admin.inviteCode.desc') }}</p>
    </div>

    <!-- Generate Form -->
    <div class="invite-generate-bar glass-card">
      <div class="invite-generate-fields">
        <div class="form-group">
          <label for="invite-role-select" class="form-label">{{
            $t('admin.inviteCode.fieldRole')
          }}</label>
          <select id="invite-role-select" v-model="inviteForm.role" class="form-input select-input">
            <option value="student">{{ $t('admin.inviteCode.roleStudent') }}</option>
            <option value="teacher">{{ $t('admin.inviteCode.roleTeacher') }}</option>
            <option value="pastor">{{ $t('admin.inviteCode.rolePastor') }}</option>
            <option value="parent">{{ $t('admin.inviteCode.roleParent') }}</option>
            <option value="admin">{{ $t('admin.inviteCode.roleAdmin') }}</option>
          </select>
        </div>
        <div v-if="inviteForm.role !== 'admin'" class="form-group">
          <label for="invite-church-select" class="form-label">{{
            $t('admin.inviteCode.fieldChurch')
          }}</label>
          <select
            id="invite-church-select"
            v-model="inviteForm.church"
            class="form-input select-input"
          >
            <option v-for="c in CHURCHES" :key="c" :value="c">{{ c }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="invite-expiry-select" class="form-label">{{
            $t('admin.inviteCode.fieldExpiry')
          }}</label>
          <select
            id="invite-expiry-select"
            v-model="inviteForm.expiryDays"
            class="form-input select-input"
          >
            <option :value="3">{{ $t('admin.inviteCode.days3') }}</option>
            <option :value="7">{{ $t('admin.inviteCode.days7') }}</option>
            <option :value="14">{{ $t('admin.inviteCode.days14') }}</option>
            <option :value="30">{{ $t('admin.inviteCode.days30') }}</option>
          </select>
        </div>
      </div>
      <button id="btn-generate-invite" class="btn btn-primary" @click="generateInviteCode">
        {{ $t('admin.inviteCode.generateBtn') }}
      </button>

      <!-- Generated Code Display -->
      <div v-if="lastGeneratedCode" class="generated-code-display">
        <span class="generated-code-text">{{ lastGeneratedCode }}</span>
        <button
          id="btn-copy-invite"
          class="btn btn-outline btn-sm"
          @click="copyInviteCode(lastGeneratedCode)"
        >
          {{ $t('admin.inviteCode.copyBtn') }}
        </button>
      </div>
    </div>

    <!-- Invite Codes List -->
    <div class="invite-list mt-4">
      <div v-if="allInviteCodes.length === 0" class="text-center text-muted py-4">
        {{ $t('admin.inviteCode.emptyList') }}
      </div>
      <table v-else class="invite-table">
        <caption class="sr-only">
          {{
            $t('admin.inviteCode.tableCaption')
          }}
        </caption>
        <thead>
          <tr>
            <th>{{ $t('admin.inviteCode.colCode') }}</th>
            <th>{{ $t('admin.inviteCode.colRole') }}</th>
            <th>{{ $t('admin.inviteCode.colChurch') }}</th>
            <th>{{ $t('admin.inviteCode.colExpiry') }}</th>
            <th>{{ $t('admin.inviteCode.colStatus') }}</th>
            <th>{{ $t('admin.inviteCode.colRevoke') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="code in allInviteCodes" :key="code.code" :class="inviteRowClass(code)">
            <td>
              <code class="invite-code-cell">{{ code.code }}</code>
            </td>
            <td>{{ inviteRoleLabel(code.role) }}</td>
            <td>{{ code.church || '—' }}</td>
            <td>{{ formatInviteDate(code.expiresAt) }}</td>
            <td>
              <span :class="['invite-status-badge', inviteStatusClass(code)]">{{
                inviteStatusLabel(code)
              }}</span>
            </td>
            <td>
              <button
                v-if="!code.usedBy && !code.revoked"
                class="btn btn-danger btn-sm"
                @click="revokeCode(code.code)"
              >
                {{ $t('admin.inviteCode.revokeBtn') }}
              </button>
              <span v-else class="text-muted" style="font-size: 0.75rem">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useToast } from '@/composables/useToast'
import { useAuthStore, CHURCHES } from '@/stores/auth'
import type { UserRole, InviteCode } from '@/stores/auth'
import { DEFAULT_CHURCH } from '@/types/auth'

const { confirm, toast } = useToast()
const { t } = useI18n()
const authStore = useAuthStore()

const inviteForm = reactive({
  role: 'teacher' as UserRole,
  church: DEFAULT_CHURCH,
  expiryDays: 7
})
const lastGeneratedCode = ref('')

const allInviteCodes = computed(() => authStore.getInviteCodes())

function generateInviteCode() {
  const me = authStore.currentUser
  if (!me) return
  const church = inviteForm.role !== 'admin' ? inviteForm.church : undefined
  const code = authStore.generateInviteCode(
    inviteForm.role,
    church,
    me.username,
    inviteForm.expiryDays
  )
  lastGeneratedCode.value = code
  toast(t('admin.inviteCode.generated', { code }), 'success')
}

async function revokeCode(code: string) {
  const ok = await confirm(t('admin.inviteCode.revokeConfirm', { code }))
  if (!ok) return
  const result = authStore.revokeInviteCode(code)
  toast(result.message, result.success ? 'success' : 'error')
}

function copyInviteCode(code: string) {
  navigator.clipboard
    .writeText(code)
    .then(() => {
      toast(t('admin.inviteCode.copySuccess'), 'success')
    })
    .catch(() => {
      toast(t('admin.inviteCode.copyFallback', { code }), 'info')
    })
}

function inviteRoleLabel(role: UserRole): string {
  const keyMap: Record<UserRole, string> = {
    student: 'admin.inviteCode.roleStudent',
    teacher: 'admin.inviteCode.roleTeacher',
    pastor: 'admin.inviteCode.rolePastor',
    parent: 'admin.inviteCode.roleParent',
    admin: 'admin.inviteCode.roleAdmin'
  }
  return keyMap[role] ? t(keyMap[role]) : role
}

function formatInviteDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

function inviteStatusLabel(code: InviteCode): string {
  if (code.revoked) return t('admin.inviteCode.statusRevoked')
  if (code.usedBy) return `${t('admin.inviteCode.statusUsed')} (${code.usedBy})`
  if (new Date() > new Date(code.expiresAt)) return t('admin.inviteCode.statusExpired')
  return t('admin.inviteCode.statusActive')
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
</script>

<style scoped src="./admin-shared.css"></style>

<style scoped>
.mt-6 {
  margin-top: 1.5rem;
}

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
  color: #047857;
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
</style>
