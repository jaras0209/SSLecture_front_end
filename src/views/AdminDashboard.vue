<template>
  <div class="admin-dashboard container">
    <!-- Header banner -->
    <header class="dashboard-header glass-panel">
      <div class="admin-header-user-row">
        <div
          class="admin-avatar-wrap"
          :title="$t('common.editProfileHint')"
          @click="showProfileDialog = true"
        >
          <img :src="authStore.currentUser?.avatarUrl" alt="avatar" class="admin-avatar-sm" />
          <span class="admin-role-badge">👑</span>
        </div>
        <div>
          <h2>{{ $t('admin.header.title') }}</h2>
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

    <!-- Profile Dialog -->
    <ProfileDialog v-model="showProfileDialog" />

    <div class="dashboard-body">
      <AdminCreateUserPanel />
      <AdminUserTable />
    </div>

    <AdminChurchOverview />
    <AdminTeachingStats />
    <AdminInviteCodes />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineAsyncComponent } from 'vue'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useAuthStore } from '@/stores/auth'
import AdminCreateUserPanel from '@/components/admin/AdminCreateUserPanel.vue'
import AdminUserTable from '@/components/admin/AdminUserTable.vue'
import AdminChurchOverview from '@/components/admin/AdminChurchOverview.vue'
import AdminTeachingStats from '@/components/admin/AdminTeachingStats.vue'
import AdminInviteCodes from '@/components/admin/AdminInviteCodes.vue'

const { tDateTime } = useI18nHelper()

// 大型 Dialog 元件：按需載入
const ProfileDialog = defineAsyncComponent(() => import('@/components/shared/ProfileDialog.vue'))

const authStore = useAuthStore()

const showProfileDialog = ref(false)

const adminDisplayName = computed(() => {
  const u = authStore.currentUser
  return u?.displayName || u?.username || ''
})
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
  grid-template-columns: 0.7fr 1.3fr;
  gap: 2rem;
}

@media (max-width: 900px) {
  .dashboard-body {
    grid-template-columns: 1fr;
  }
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

  /* Glass panels */
  .glass-panel {
    padding: 1rem !important;
  }
}
</style>
