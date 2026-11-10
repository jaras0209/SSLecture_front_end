<template>
  <section class="admin-section glass-panel mt-6" aria-labelledby="backup-title">
    <div class="section-header">
      <h3 id="backup-title" aria-level="2">💾 {{ $t('admin.backup.title') }}</h3>
      <p class="section-desc">{{ $t('admin.backup.desc') }}</p>
    </div>

    <p class="backup-last" :class="{ overdue }">
      {{ lastExport }}
    </p>

    <p class="backup-caution">⚠️ {{ $t('admin.backup.caution') }}</p>

    <div class="backup-actions">
      <button id="btn-export-backup" type="button" class="btn btn-primary" @click="exportAll">
        {{ $t('admin.backup.export') }}
      </button>

      <label for="backup-file" class="btn btn-outline backup-import-label">
        {{ $t('admin.backup.import') }}
      </label>
      <input
        id="backup-file"
        ref="fileInput"
        type="file"
        accept="application/json,.json"
        class="sr-only"
        aria-describedby="backup-import-hint"
        @change="importFile"
      />
    </div>
    <p id="backup-import-hint" class="backup-hint">{{ $t('admin.backup.importHint') }}</p>

    <p v-if="problem" class="alert-box error backup-problem" role="alert">{{ problem }}</p>
  </section>
</template>

<script setup lang="ts">
/**
 * 管理員：匯出全部資料為備份檔、從備份檔還原（見 utils/backup.ts）。
 * 還原會取代這台電腦上的所有資料，所以先說明檔案內容並請管理員確認；
 * 還原後登出並重新載入，讓畫面讀取還原後的資料。
 */
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useI18nHelper } from '@/composables/useI18nHelper'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useBookingsStore } from '@/stores/bookings'
import {
  accountCount,
  backupFileName,
  BACKUP_REMIND_AFTER_MS,
  createBackup,
  lastBackupAt,
  noteBackup,
  parseBackup,
  restoreBackup
} from '@/utils/backup'
import { noteSignOutReason } from '@/utils/session'

const emit = defineEmits<{
  /** Restored: the page must reload to read the restored data (App does it) */
  restored: []
  /** A backup was downloaded */
  exported: []
}>()

const { t } = useI18n()
const { tDateTime, tDaysAgo } = useI18nHelper()
const { toast, confirm } = useToast()
const authStore = useAuthStore()

const problem = ref('')

/** When this computer last made a backup, and how that reads */
const lastBackup = ref(lastBackupAt())
const overdue = computed(
  () => lastBackup.value === null || Date.now() - lastBackup.value > BACKUP_REMIND_AFTER_MS
)
const lastExport = computed(() =>
  lastBackup.value === null
    ? t('admin.backup.neverExported')
    : t('admin.backup.lastExported', {
        date: tDateTime(new Date(lastBackup.value).toISOString()),
        ago: tDaysAgo(lastBackup.value)
      })
)
const fileInput = ref<HTMLInputElement | null>(null)

function exportAll() {
  // Every store must exist to be written out with the backup (createBackup)
  useCoursesStore()
  useBookingsStore()
  const now = new Date()
  const blob = new Blob([JSON.stringify(createBackup(now), null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName(now)
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
  noteBackup(now.getTime())
  lastBackup.value = now.getTime()
  emit('exported')
  toast(t('admin.backup.exported'), 'info')
}

async function importFile() {
  problem.value = ''
  const input = fileInput.value
  const file = input?.files?.[0]
  if (!input || !file) return
  // Let the same file be chosen again after this attempt
  const text = await file.text().finally(() => (input.value = ''))

  const parsed = parseBackup(text)
  if (!parsed.ok) {
    problem.value = t(`admin.backup.problem.${parsed.problem}`)
    return
  }
  const { backup } = parsed
  const ok = await confirm(
    t('admin.backup.confirmRestore', {
      date: tDateTime(backup.exportedAt),
      n: accountCount(backup)
    })
  )
  if (!ok) return

  if (!restoreBackup(backup)) {
    problem.value = t('admin.backup.problem.notSaved')
    return
  }
  // Everyone signs in again against the restored accounts
  noteSignOutReason('restored')
  authStore.logout()
  emit('restored')
}
</script>

<style scoped src="./admin-shared.css"></style>

<style scoped>
.mt-6 {
  margin-top: 1.5rem;
}

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

.backup-last {
  margin: 0 0 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.backup-last.overdue {
  color: #b45309;
}

.backup-caution {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: #92400e;
}

.backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.backup-import-label {
  cursor: pointer;
}

/* The hidden file input's label is the button: show where the keyboard focus is */
.backup-actions:has(input:focus-visible) .backup-import-label {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

.backup-hint {
  margin: 0.6rem 0 0;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.backup-problem {
  margin: 1rem 0 0;
  text-align: left;
}
</style>
