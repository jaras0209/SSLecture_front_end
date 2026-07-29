<template>
  <div class="no-print">
    <div class="pastor-overview-grid">
      <!-- Church Stats Header -->
      <section class="glass-panel pastor-stats-panel">
        <h3>⛪ {{ authStore.currentUser?.church }} — 教會總覽</h3>
        <div class="pastor-stats-grid mt-4">
          <div class="stat-box">
            <span class="stat-val">{{ pastorChurchStudents.length }}</span>
            <span class="stat-lbl">SS 學員總數</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">{{ pastorChurchTeachers.length }}</span>
            <span class="stat-lbl">輔導教師數量</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">{{ totalNotesSubmitted }}</span>
            <span class="stat-lbl">累計心得筆數</span>
          </div>
        </div>
      </section>

      <!-- Caretaker Assignments Matching Panel -->
      <section class="glass-panel pastor-match-panel">
        <h4 class="mb-4">📋 教會專屬配對管理板</h4>
        <p class="section-desc mb-4 text-sm text-muted">分區牧者專用：直接為您教會內的學員指派專屬輔導教師</p>
        <div class="table-container">
          <table class="students-table match-table">
            <thead>
              <tr>
                <th>SS學員</th>
                <th>輔導教師</th>
                <th>關懷家長</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stdUsername in pastorChurchStudents" :key="stdUsername">
                <td class="student-cell">
                  <img
                    :src="authStore.usersDb[stdUsername]?.avatarUrl || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${stdUsername}`"
                    class="avatar-sm" alt="Avatar"
                  />
                  <div class="student-name-col">
                    <strong>{{ authStore.usersDb[stdUsername]?.realName || stdUsername }}</strong>
                    <span v-if="authStore.usersDb[stdUsername]?.displayName" class="student-nickname-tag">
                      「{{ authStore.usersDb[stdUsername]?.displayName }}」
                    </span>
                    <span v-if="authStore.usersDb[stdUsername]?.realName" class="student-id-tag">@{{ stdUsername }}</span>
                  </div>
                </td>
                <td>
                  <select
                    :value="coursesStore.getStudentCaretaker(stdUsername, 'teacher')"
                    @change="(e) => onSetCaretaker(stdUsername, 'teacher', (e.target as HTMLSelectElement).value)"
                    class="form-input text-sm"
                  >
                    <option value="">-- 未指派 --</option>
                    <option v-for="t in pastorChurchTeachers" :key="t" :value="t">
                      {{ authStore.usersDb[t]?.realName || t }}
                      {{ authStore.usersDb[t]?.displayName ? `「${authStore.usersDb[t]?.displayName}」` : '' }}
                    </option>
                  </select>
                </td>
                <td>
                  <select
                    :value="coursesStore.getStudentCaretaker(stdUsername, 'parent')"
                    @change="(e) => onSetCaretaker(stdUsername, 'parent', (e.target as HTMLSelectElement).value)"
                    class="form-input text-sm"
                  >
                    <option value="">-- 未指派 --</option>
                    <option v-for="pa in pastorChurchParents" :key="pa" :value="pa">
                      {{ authStore.usersDb[pa]?.realName || pa }}
                      {{ authStore.usersDb[pa]?.displayName ? `「${authStore.usersDb[pa]?.displayName}」` : '' }}
                    </option>
                  </select>
                </td>
              </tr>
              <tr v-if="pastorChurchStudents.length === 0">
                <td colspan="3" class="text-center empty-row">目前教會中無學員帳號</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Teacher Management Overview Table -->
      <section class="glass-panel pastor-teacher-panel">
        <h4 class="mb-4">👨‍🏫 教師管理概況</h4>
        <div class="table-container">
          <table class="students-table">
            <thead>
              <tr>
                <th>輔導教師</th>
                <th>管理的 SS 數量</th>
                <th>管理的 SS 學員</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="teacher in pastorChurchTeachers" :key="teacher">
                <td class="student-cell">
                  <img
                    :src="authStore.usersDb[teacher]?.avatarUrl || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${teacher}`"
                    class="avatar-sm" alt="Avatar"
                  />
                  <div class="student-name-col">
                    <span class="student-name">{{ authStore.usersDb[teacher]?.realName || teacher }}</span>
                    <span v-if="authStore.usersDb[teacher]?.displayName" class="student-nickname-tag">
                      「{{ authStore.usersDb[teacher]?.displayName }}」
                    </span>
                    <span v-if="authStore.usersDb[teacher]?.realName" class="student-id-tag">@{{ teacher }}</span>
                  </div>
                </td>
                <td>
                  <span class="badge badge-teacher">{{ getTeacherManagedStudents(teacher).length }} 位</span>
                </td>
                <td>
                  <div class="managed-students-list">
                    <span
                      v-for="s in getTeacherManagedStudents(teacher)"
                      :key="s"
                      class="badge badge-student mr-1"
                      :title="`帳號：${s}`"
                    >🎒 {{ authStore.usersDb[s]?.realName || s }}</span>
                    <span v-if="getTeacherManagedStudents(teacher).length === 0" class="text-muted text-xs italic">尚未管理任何學員</span>
                  </div>
                </td>
              </tr>
              <tr v-if="pastorChurchTeachers.length === 0">
                <td colspan="3" class="text-center empty-row">目前教會中無輔導教師帳號</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Lecturer Stats -->
      <section class="glass-panel pastor-lecturer-panel">
        <h4 class="mb-4">📊 講師授課統計（本教會 SS）</h4>
        <div class="table-container">
          <table class="students-table">
            <thead>
              <tr>
                <th>講師姓名</th>
                <th>授課次數</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in pastorLecturerStats" :key="stat.lecturerName">
                <td><span class="student-name">🎤 {{ stat.lecturerName }}</span></td>
                <td><span class="badge badge-teacher">{{ stat.sessionCount }} 次</span></td>
              </tr>
              <tr v-if="pastorLecturerStats.length === 0">
                <td colspan="2" class="text-center empty-row">本教會學員尚未登記任何授課講師</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { ProgressRecord } from '@/stores/courses'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

const pastorChurch = computed(() => authStore.currentUser?.church || '')

const pastorChurchStudents = computed(() =>
  Object.entries(authStore.usersDb)
    .filter(([, u]) => u.role === 'student' && u.church === pastorChurch.value)
    .map(([username]) => username)
)

const pastorChurchTeachers = computed(() =>
  Object.entries(authStore.usersDb)
    .filter(([, u]) => u.role === 'teacher' && u.church === pastorChurch.value)
    .map(([username]) => username)
)

const pastorChurchParents = computed(() =>
  Object.entries(authStore.usersDb)
    .filter(([, u]) => u.role === 'parent' && u.church === pastorChurch.value)
    .map(([username]) => username)
)

const totalNotesSubmitted = computed(() => {
  let total = 0
  for (const username of pastorChurchStudents.value) {
    const userRecords = coursesStore.progressDb[username]
    if (!userRecords) continue
    total += Object.values(userRecords).filter((r: ProgressRecord) => r.notes && String(r.notes).trim()).length
  }
  return total
})

const pastorLecturerStats = computed(() => {
  const map = new Map<string, number>()
  for (const username of pastorChurchStudents.value) {
    const userRecords = coursesStore.progressDb[username]
    if (!userRecords) continue
    for (const record of Object.values(userRecords) as any[]) {
      if (record.sessions) {
        for (const s of record.sessions) {
          if (s.lecturer) map.set(s.lecturer, (map.get(s.lecturer) ?? 0) + 1)
        }
      }
    }
  }
  return Array.from(map.entries())
    .map(([lecturerName, sessionCount]) => ({ lecturerName, sessionCount }))
    .sort((a, b) => b.sessionCount - a.sessionCount)
})

function getTeacherManagedStudents(teacherUsername: string): string[] {
  return coursesStore.getStudentsManagedByTeacher(teacherUsername)
}

function onSetCaretaker(studentUsername: string, role: 'teacher' | 'parent', value: string) {
  if (value) {
    coursesStore.assignStudentCaretaker(studentUsername, role, value)
    // For parent role, also update childUsernames
    if (role === 'parent') {
      const prevParent = coursesStore.getStudentCaretaker(studentUsername, 'parent')
      if (prevParent && prevParent !== value) {
        const prevUser = authStore.usersDb[prevParent]
        if (prevUser?.childUsernames) {
          prevUser.childUsernames = prevUser.childUsernames.filter((u: string) => u !== studentUsername)
        }
      }
      const newParentUser = authStore.usersDb[value]
      if (newParentUser) {
        if (!newParentUser.childUsernames) newParentUser.childUsernames = []
        if (!newParentUser.childUsernames.includes(studentUsername)) {
          newParentUser.childUsernames.push(studentUsername)
        }
      }
    }
  } else {
    coursesStore.removeStudentCaretaker(studentUsername, role)
  }
}
</script>
