<template>
  <div class="admin-dashboard container">
    <!-- Header banner -->
    <header class="dashboard-header glass-panel">
      <div class="admin-header-user-row">
        <div
          class="admin-avatar-wrap"
          :title="$t('common.editProfileHint')"
          role="button"
          tabindex="0"
          :aria-label="$t('common.editProfileHint')"
          @click="showProfileDialog = true"
          @keydown.enter.prevent="showProfileDialog = true"
          @keydown.space.prevent="showProfileDialog = true"
        >
          <img
            :src="avatarSrc(authStore.currentUser?.avatarUrl)"
            alt="avatar"
            class="admin-avatar-sm"
            referrerpolicy="no-referrer"
            @error="useFallbackAvatar"
          />
          <span class="admin-role-badge">👑</span>
        </div>
        <div>
          <h1 class="page-title">{{ $t('admin.header.title') }}</h1>
          <p>{{ $t('admin.header.desc', { name: adminDisplayName }) }}</p>
          <p
            v-if="authStore.currentUser?.lastLoginAt"
            style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px"
          >
            🕐
            {{
              $t('admin.header.lastLogin', { time: tDateTime(authStore.currentUser?.lastLoginAt) })
            }}
          </p>
        </div>
      </div>
    </header>

    <!-- Remind to back up: the data lives only in this browser (utils/backup.ts) -->
    <div v-if="backupReminder" class="backup-reminder glass-panel" role="status">
      <p>💾 {{ backupReminder }}</p>
      <div class="backup-reminder-actions">
        <button type="button" class="btn btn-primary btn-sm" @click="goToBackup">
          {{ $t('admin.backup.remind.goto') }}
        </button>
        <button type="button" class="btn btn-outline btn-sm" @click="remindLater">
          {{ $t('admin.backup.remind.later') }}
        </button>
      </div>
    </div>

    <!-- Profile Dialog -->
    <ProfileDialog v-model="showProfileDialog" />

    <div class="dashboard-body">
      <AdminCreateUserPanel />
      <AdminUserTable />
    </div>

    <AdminChurchOverview />
    <ChurchBookings />
    <AdminTeachingStats />
    <AdminInviteCodes />
    <AdminDataBackup @restored="reloadWithRestoredData" @exported="checkBackup" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore } from '@/stores/auth'
import AdminCreateUserPanel from '@/components/admin/AdminCreateUserPanel.vue'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import AdminChurchOverview from '@/components/admin/AdminChurchOverview.vue'
import AdminTeachingStats from '@/components/admin/AdminTeachingStats.vue'
import AdminInviteCodes from '@/components/admin/AdminInviteCodes.vue'
import AdminDataBackup from '@/components/admin/AdminDataBackup.vue'
import { backupOverdue, lastBackupAt } from '@/utils/backup'
import ChurchBookings from '@/components/shared/ChurchBookings.vue'
import { avatarSrc, useFallbackAvatar } from '@/utils/avatar'

const { t } = useI18n()
const { tDateTime } = useI18nHelper()

// 大型 Dialog 元件：按需載入
const ProfileDialog = defineAsyncComponent(() => import('@/components/shared/ProfileDialog.vue'))

const authStore = useAuthStore()

const showProfileDialog = ref(false)

const adminDisplayName = computed(() => {
  const u = authStore.currentUser
  return u?.displayName || u?.username || ''
})

// ── Backup reminder ──
/** "Remind me later" lasts until the browser closes */
const REMIND_LATER_KEY = 'superstart_backup_remind_later'
const DAY = 24 * 60 * 60 * 1000

const backupDue = ref(false)
function checkBackup() {
  let later = false
  try {
    later = sessionStorage.getItem(REMIND_LATER_KEY) === '1'
  } catch {
    /* no sessionStorage: remind */
  }
  backupDue.value = !later && backupOverdue()
}
checkBackup()

const backupReminder = computed(() => {
  if (!backupDue.value) return ''
  const last = lastBackupAt()
  return last === null
    ? t('admin.backup.remind.never')
    : t('admin.backup.remind.stale', { days: Math.floor((Date.now() - last) / DAY) })
})

function remindLater() {
  try {
    sessionStorage.setItem(REMIND_LATER_KEY, '1')
  } catch {
    /* it just shows again next time */
  }
  backupDue.value = false
}

/** Bring the backup section into view, with the keyboard focus on the export button */
function goToBackup() {
  const button = document.getElementById('btn-export-backup')
  button?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  button?.focus({ preventScroll: true })
}

/** After a restore the stores still hold the old data in memory: start the app afresh */
function reloadWithRestoredData() {
  window.location.reload()
}
</script>

<style scoped>
.backup-reminder {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem 1.25rem;
  border-left: 4px solid #f59e0b;
}

.backup-reminder p {
  margin: 0;
  flex: 1 1 18rem;
  font-weight: 600;
  color: #92400e;
}

.backup-reminder-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

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
  border: 2px solid rgba(99, 102, 241, 0.3);
  object-fit: cover;
  transition: opacity 0.2s;
}
.admin-avatar-wrap:hover .admin-avatar-sm {
  opacity: 0.8;
}
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
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.dashboard-body {
  display: grid;
  /* minmax(0, …): let columns shrink below their tables' width (the tables scroll in
     their own wrappers) instead of widening the page */
  grid-template-columns: minmax(0, 0.7fr) minmax(0, 1.3fr);
  gap: 2rem;
}

@media (max-width: 900px) {
  .dashboard-body {
    grid-template-columns: minmax(0, 1fr);
  }
}

/* ══════════════════════════════════════════
   AdminDashboard — Mobile RWD (640px)
══════════════════════════════════════════ */
@media (max-width: 640px) {
  /* Dashboard body: single column */
  .dashboard-body {
    grid-template-columns: minmax(0, 1fr);
    gap: 1rem;
  }

  /* Glass panels */
  .glass-panel {
    padding: 1rem !important;
  }
}
</style>
