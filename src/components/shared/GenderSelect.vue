<template>
  <select
    :value="authStore.usersDb[username]?.gender ?? ''"
    class="form-input text-sm gender-select"
    :class="{ unset: !authStore.usersDb[username]?.gender }"
    :aria-label="$t('gender.genderFor', { name })"
    @change="onChange"
  >
    <option value="">{{ $t('gender.unset') }}</option>
    <option value="male">{{ $t('gender.male') }}</option>
    <option value="female">{{ $t('gender.female') }}</option>
  </select>
</template>

<script setup lang="ts">
/**
 * 設定教師或學員的性別（牧者總覽、SS 中央的成員清單共用）。
 * 直接寫入 auth store；只接受教師與學員帳號。
 */
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import type { Gender } from '@/types/auth'
import { usesBackend } from '@/utils/backendMode'
import { useToast } from '@/composables/useToast'

const props = defineProps<{ username: string }>()

const authStore = useAuthStore()
const { toast } = useToast()
const name = computed(() => authStore.usersDb[props.username]?.realName || props.username)

async function onChange(e: Event) {
  const value = (e.target as HTMLSelectElement).value
  // With the backend an admin sets it on the server (a pastor's way comes with step 3 of the plan)
  if (usesBackend() && authStore.currentUser?.role === 'admin') {
    const result = await authStore.adminUpdateAccount(props.username, {
      gender: value as Gender | ''
    })
    if (!result.success) toast(result.message, 'error')
    return
  }
  authStore.setGender(props.username, (value || undefined) as Gender | undefined)
}
</script>

<style scoped>
.gender-select {
  min-width: 7.5rem;
}
.gender-select.unset {
  color: #92400e;
}
</style>
