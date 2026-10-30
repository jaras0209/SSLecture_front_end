<template>
  <div class="no-print">
    <div class="pastor-overview-grid">
      <!-- Church Stats Header -->
      <section class="glass-panel pastor-stats-panel">
        <h3 aria-level="2">
          {{ $t('teacher.pastor.churchOverviewTitle', { church: authStore.currentUser?.church }) }}
        </h3>
        <div class="pastor-stats-grid mt-4">
          <div class="stat-box">
            <span class="stat-val">{{ pastorChurchStudents.length }}</span>
            <span class="stat-lbl">{{ $t('teacher.pastor.totalStudents') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">{{ pastorChurchTeachers.length }}</span>
            <span class="stat-lbl">{{ $t('teacher.pastor.teacherCount') }}</span>
          </div>
          <div class="stat-box">
            <span class="stat-val">{{ totalNotesSubmitted }}</span>
            <span class="stat-lbl">{{ $t('teacher.pastor.totalNotes') }}</span>
          </div>
        </div>
      </section>

      <!-- Caretaker Assignments Matching Panel -->
      <section class="glass-panel pastor-match-panel">
        <h4 aria-level="3" class="mb-4">{{ $t('teacher.pastor.matchPanelTitle') }}</h4>
        <p class="section-desc mb-4 text-sm text-muted">
          {{ $t('teacher.pastor.matchPanelDesc') }}
        </p>
        <div
          class="table-container"
          tabindex="0"
          role="region"
          :aria-label="$t('a11y.tableScroll', { title: $t('teacher.pastor.matchTableCaption') })"
        >
          <table class="students-table match-table">
            <caption class="sr-only">
              {{
                $t('teacher.pastor.matchTableCaption')
              }}
            </caption>
            <thead>
              <tr>
                <th>{{ $t('teacher.pastor.colStudent') }}</th>
                <th>{{ $t('teacher.pastor.colTeacher') }}</th>
                <th>{{ $t('teacher.pastor.colParent') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stdUsername in pastorChurchStudents" :key="stdUsername">
                <td class="student-cell">
                  <img
                    :src="
                      avatarSrc(
                        authStore.usersDb[stdUsername]?.avatarUrl || defaultAvatarUrl(stdUsername)
                      )
                    "
                    class="avatar-sm"
                    alt="Avatar"
                  />
                  <div class="student-name-col">
                    <strong>{{ authStore.usersDb[stdUsername]?.realName || stdUsername }}</strong>
                    <span
                      v-if="authStore.usersDb[stdUsername]?.displayName"
                      class="student-nickname-tag"
                    >
                      「{{ authStore.usersDb[stdUsername]?.displayName }}」
                    </span>
                    <span v-if="authStore.usersDb[stdUsername]?.realName" class="student-id-tag"
                      >@{{ stdUsername }}</span
                    >
                  </div>
                </td>
                <td>
                  <select
                    :value="coursesStore.getStudentCaretaker(stdUsername, 'teacher')"
                    class="form-input text-sm"
                    :aria-label="
                      $t('a11y.caretakerFor', {
                        student: stdUsername,
                        role: $t('roleLabel.teacher')
                      })
                    "
                    @change="
                      (e) =>
                        onSetCaretaker(
                          stdUsername,
                          'teacher',
                          (e.target as HTMLSelectElement).value
                        )
                    "
                  >
                    <option value="">{{ $t('teacher.pastor.noAssigned') }}</option>
                    <option v-for="t in pastorChurchTeachers" :key="t" :value="t">
                      {{ authStore.usersDb[t]?.realName || t }}
                      {{
                        authStore.usersDb[t]?.displayName
                          ? `「${authStore.usersDb[t]?.displayName}」`
                          : ''
                      }}
                    </option>
                  </select>
                </td>
                <td>
                  <select
                    :value="coursesStore.getStudentCaretaker(stdUsername, 'parent')"
                    class="form-input text-sm"
                    :aria-label="
                      $t('a11y.caretakerFor', {
                        student: stdUsername,
                        role: $t('roleLabel.parent')
                      })
                    "
                    @change="
                      (e) =>
                        onSetCaretaker(stdUsername, 'parent', (e.target as HTMLSelectElement).value)
                    "
                  >
                    <option value="">{{ $t('teacher.pastor.noAssigned') }}</option>
                    <option v-for="pa in pastorChurchParents" :key="pa" :value="pa">
                      {{ authStore.usersDb[pa]?.realName || pa }}
                      {{
                        authStore.usersDb[pa]?.displayName
                          ? `「${authStore.usersDb[pa]?.displayName}」`
                          : ''
                      }}
                    </option>
                  </select>
                </td>
              </tr>
              <tr v-if="pastorChurchStudents.length === 0">
                <td colspan="3" class="text-center empty-row">
                  {{ $t('teacher.pastor.noStudents') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Teacher Management Overview Table -->
      <section class="glass-panel pastor-teacher-panel">
        <h4 aria-level="3" class="mb-4">{{ $t('teacher.pastor.teacherOverviewTitle') }}</h4>
        <div
          class="table-container"
          tabindex="0"
          role="region"
          :aria-label="$t('a11y.tableScroll', { title: $t('teacher.pastor.teacherTableCaption') })"
        >
          <table class="students-table">
            <caption class="sr-only">
              {{
                $t('teacher.pastor.teacherTableCaption')
              }}
            </caption>
            <thead>
              <tr>
                <th>{{ $t('teacher.pastor.colTeacherName') }}</th>
                <th>{{ $t('teacher.pastor.colStudentCount') }}</th>
                <th>{{ $t('teacher.pastor.colStudents') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="teacher in pastorChurchTeachers" :key="teacher">
                <td class="student-cell">
                  <img
                    :src="
                      avatarSrc(authStore.usersDb[teacher]?.avatarUrl || defaultAvatarUrl(teacher))
                    "
                    class="avatar-sm"
                    alt="Avatar"
                  />
                  <div class="student-name-col">
                    <span class="student-name">{{
                      authStore.usersDb[teacher]?.realName || teacher
                    }}</span>
                    <span
                      v-if="authStore.usersDb[teacher]?.displayName"
                      class="student-nickname-tag"
                    >
                      「{{ authStore.usersDb[teacher]?.displayName }}」
                    </span>
                    <span v-if="authStore.usersDb[teacher]?.realName" class="student-id-tag"
                      >@{{ teacher }}</span
                    >
                  </div>
                </td>
                <td>
                  <span class="badge badge-teacher">{{
                    $t('teacher.pastor.countSuffix', {
                      n: getTeacherManagedStudents(teacher).length
                    })
                  }}</span>
                </td>
                <td>
                  <div class="managed-students-list">
                    <span
                      v-for="s in getTeacherManagedStudents(teacher)"
                      :key="s"
                      class="badge badge-student mr-1"
                      :title="`@${s}`"
                      >🎒 {{ authStore.usersDb[s]?.realName || s }}</span
                    >
                    <span
                      v-if="getTeacherManagedStudents(teacher).length === 0"
                      class="text-muted text-xs italic"
                      >{{ $t('teacher.pastor.noManagedStudents') }}</span
                    >
                  </div>
                </td>
              </tr>
              <tr v-if="pastorChurchTeachers.length === 0">
                <td colspan="3" class="text-center empty-row">
                  {{ $t('teacher.pastor.noTeachers') }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Lecturer Stats -->
      <section class="glass-panel pastor-lecturer-panel">
        <h4 aria-level="3" class="mb-4">{{ $t('teacher.pastor.lecturerStatsTitle') }}</h4>
        <div
          class="table-container"
          tabindex="0"
          role="region"
          :aria-label="$t('a11y.tableScroll', { title: $t('teacher.pastor.lecturerTableCaption') })"
        >
          <table class="students-table">
            <caption class="sr-only">
              {{
                $t('teacher.pastor.lecturerTableCaption')
              }}
            </caption>
            <thead>
              <tr>
                <th>{{ $t('teacher.pastor.colLecturer') }}</th>
                <th>{{ $t('teacher.pastor.colSessions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="stat in pastorLecturerStats" :key="stat.lecturerName">
                <td>
                  <span class="student-name">🎤 {{ stat.lecturerName }}</span>
                </td>
                <td>
                  <span class="badge badge-teacher">{{
                    $t('teacher.pastor.sessionCountSuffix', { n: stat.sessionCount })
                  }}</span>
                </td>
              </tr>
              <tr v-if="pastorLecturerStats.length === 0">
                <td colspan="2" class="text-center empty-row">
                  {{ $t('teacher.pastor.noLecturers') }}
                </td>
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
import { avatarSrc, defaultAvatarUrl } from '@/utils/avatar'
import { membersOf } from '@/utils/scope'

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

const pastorChurch = computed(() => authStore.currentUser?.church || '')

const pastorChurchStudents = computed(() =>
  membersOf(authStore.usersDb, 'student', pastorChurch.value)
)
const pastorChurchTeachers = computed(() =>
  membersOf(authStore.usersDb, 'teacher', pastorChurch.value)
)
const pastorChurchParents = computed(() =>
  membersOf(authStore.usersDb, 'parent', pastorChurch.value)
)

const totalNotesSubmitted = computed(() => {
  let total = 0
  for (const username of pastorChurchStudents.value) {
    const userRecords = coursesStore.progressDb[username]
    if (!userRecords) continue
    total += Object.values(userRecords).filter(
      (r: ProgressRecord) => r.notes && String(r.notes).trim()
    ).length
  }
  return total
})

const pastorLecturerStats = computed(() => {
  const map = new Map<string, number>()
  for (const username of pastorChurchStudents.value) {
    const userRecords = coursesStore.progressDb[username]
    if (!userRecords) continue
    for (const record of Object.values(userRecords)) {
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
          prevUser.childUsernames = prevUser.childUsernames.filter(
            (u: string) => u !== studentUsername
          )
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

<style scoped>
/* [css-migration] moved from TeacherDashboard.vue */
/* Nickname tag shown below real name */
.student-nickname-tag {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
  font-style: italic;
}

.pastor-overview-grid {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.pastor-stats-grid {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.managed-students-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.mr-1 {
  margin-right: 0.25rem;
}
</style>

<style>
/*
 * Intentionally global: used by several components, element selectors / keyframes,
 * or rules whose look depends on cascade order against main.css and other global
 * styles (scoping would raise their specificity and change what wins).
 *
 * Every selector is guarded by :where(body:has(.teacher-dashboard)) so these rules only apply
 * while that page is on screen; otherwise they would keep applying to other pages
 * after the user switches account in the same tab. :where() adds no specificity.
 */
:where(body:has(.teacher-dashboard)) .pastor-stats-panel {
  padding: 2rem;
  border-radius: var(--radius-lg);
}

:where(body:has(.teacher-dashboard)) .pastor-stats-panel h3 {
  font-size: 1.4rem;
  color: var(--primary);
}

:where(body:has(.teacher-dashboard)) .pastor-teacher-panel,
:where(body:has(.teacher-dashboard)) .pastor-lecturer-panel {
  padding: 1.75rem;
  border-radius: var(--radius-lg);
}
</style>
