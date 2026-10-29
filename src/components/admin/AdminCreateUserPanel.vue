<template>
  <section class="admin-sidebar glass-panel">
    <h3 aria-level="2">➕ {{ $t('admin.createUser.title') }}</h3>
    <p class="section-desc mb-4">{{ $t('admin.createUser.desc') }}</p>

    <form class="create-form" @submit.prevent="createUser">
      <div class="form-group">
        <label class="form-label" for="new-username">{{ $t('admin.createUser.username') }}</label>
        <input
          id="new-username"
          v-model="newUser.username"
          type="text"
          class="form-input"
          :placeholder="$t('admin.createUser.usernamePlaceholder')"
          required
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="new-password">{{ $t('admin.createUser.password') }}</label>
        <input
          id="new-password"
          v-model="newUser.password"
          type="password"
          class="form-input"
          :placeholder="$t('admin.createUser.passwordPlaceholder')"
          required
        />
      </div>
      <div class="form-group">
        <label class="form-label" for="new-role">{{ $t('admin.createUser.role') }}</label>
        <select id="new-role" v-model="newUser.role" class="form-input select-input">
          <option value="student">🎒 {{ $t('admin.roles.student') }}</option>
          <option value="teacher">👨‍🏫 {{ $t('admin.roles.teacher') }}</option>
          <option value="parent">👨‍👩‍👦 {{ $t('admin.roles.parent') }}</option>
          <option value="pastor">⛪ {{ $t('admin.roles.pastor') }}</option>
          <option value="admin">👑 {{ $t('admin.roles.admin') }}</option>
        </select>
      </div>

      <div v-if="newUser.role !== 'admin'" class="form-group">
        <label class="form-label" for="new-church">{{ $t('admin.createUser.church') }}</label>
        <select id="new-church" v-model="newUser.church" class="form-input select-input">
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
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, CHURCHES } from '@/stores/auth'
import type { UserRole } from '@/stores/auth'
import { DEFAULT_CHURCH } from '@/types/auth'

const { t } = useI18n()
const authStore = useAuthStore()

const newUser = reactive({
  username: '',
  password: '',
  role: 'student' as UserRole,
  church: DEFAULT_CHURCH
})

const alertMsg = ref('')
const alertType = ref<'success' | 'error'>('success')

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
  newUser.church = DEFAULT_CHURCH
}
</script>

<style scoped src="./admin-shared.css"></style>

<style scoped>
.admin-sidebar {
  background: white;
  padding: 2rem;
  border-radius: var(--radius-lg);
  align-self: start;
}

.btn-block {
  width: 100%;
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
  background-color: #d1fae5;
  color: #065f46;
}

.alert-box.error {
  background-color: #fee2e2;
  color: #991b1b;
}

/* ══════════════════════════════════════════
   AdminDashboard — Mobile RWD (640px)
══════════════════════════════════════════ */
@media (max-width: 640px) {
  /* Sidebar compact */
  .admin-sidebar {
    padding: 1rem;
    border-radius: var(--radius-md);
  }
}

/* ══════════════════════════════════════════
   AdminDashboard — Mobile RWD (480px)
══════════════════════════════════════════ */
@media (max-width: 480px) {
  .admin-sidebar {
    padding: 0.75rem;
  }
}
</style>
