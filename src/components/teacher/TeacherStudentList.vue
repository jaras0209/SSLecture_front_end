<template>
  <!-- Search & Student List -->
  <section class="students-list-panel glass-panel">
    <div class="panel-header-row">
      <div class="tab-selectors" v-if="authStore.currentUser?.role !== 'parent'">
        <button
          v-if="authStore.currentUser?.role === 'teacher'"
          :class="['tab-btn', { active: currentTab === 'my-students' }]"
          @click="currentTab = 'my-students'"
        >
          {{ $t('teacher.studentList.myStudents', { n: myStudentsCount }) }}
        </button>
        <button
          :class="['tab-btn', { active: currentTab === 'all-students' }]"
          @click="currentTab = 'all-students'"
        >
          {{ $t('teacher.studentList.allStudents') }}
        </button>
      </div>
      <div v-else class="tab-selectors-parent-title">
        <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--primary);">
          {{ $t('teacher.studentList.childrenTitle') }}
        </h3>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        class="form-input search-input"
        :placeholder="$t('teacher.studentList.searchPlaceholder')"
        v-if="authStore.currentUser?.role !== 'parent'"
      />
    </div>

    <div class="table-container mt-4">
      <table class="students-table">
        <thead>
          <tr>
            <th>{{ $t('teacher.studentList.colName') }}</th>
            <th>{{ $t('teacher.studentList.colStatus') }}</th>
            <th>{{ $t('teacher.studentList.colCompleted') }}</th>
            <th>{{ $t('teacher.studentList.colProgress') }}</th>
            <th>{{ $t('teacher.studentList.colActions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="student in filteredStudents" :key="student.username">
            <td class="student-cell">
              <img :src="student.avatarUrl" class="avatar-sm" alt="Avatar" />
              <div class="student-name-col">
                <span class="student-name">{{ student.realName || student.username }}</span>
                <span v-if="student.realName" class="student-id-tag">@{{ student.username }}</span>
              </div>
            </td>
            <td>
              <span class="badge" :class="getCaretakerBadgeClass(student.username)">
                {{ getCaretakerStatusText(student.username) }}
              </span>
            </td>
            <td>
              <span class="badge badge-student">
                {{ student.completedCount }} / {{ coursesStore.courses.length }}
              </span>
            </td>
            <td>
              <div class="table-progress">
                <span class="percent-label">{{ student.totalProgressPercent }}%</span>
                <div class="progress-bar-container table-bar">
                  <div
                    class="progress-bar-fill"
                    :style="{ width: student.totalProgressPercent + '%' }"
                  ></div>
                </div>
              </div>
            </td>
            <td>
              <div class="action-buttons">
                <button
                  @click="emit('view-student', student)"
                  class="btn btn-secondary btn-sm"
                >
                  {{ $t('teacher.studentList.viewProgress') }}
                </button>

                <template v-if="authStore.currentUser?.role !== 'parent'">
                  <button
                    v-if="isStudentManaged(student.username) && authStore.currentUser?.role === 'teacher'"
                    @click="emit('unmanage-student', student.username)"
                    class="btn btn-danger btn-sm"
                  >
                    {{ $t('teacher.studentList.unmanage') }}
                  </button>
                  <button
                    v-else-if="!coursesStore.getStudentCaretaker(student.username, authStore.currentUser?.role as any) && authStore.currentUser?.role === 'teacher'"
                    @click="emit('manage-student', student.username)"
                    class="btn btn-primary btn-sm"
                  >
                    {{ $t('teacher.studentList.manage') }}
                  </button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="filteredStudents.length === 0">
            <td colspan="5" class="text-center empty-row">
              {{ $t('teacher.studentList.emptyList') }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import { useStudentList } from '@/composables/useStudentList'

// ?? Types ?????????????????????????????????????????????????????????????????????

export interface StudentProgressSummary {
  username: string
  realName?: string
  avatarUrl: string
  completedCount: number
  totalProgressPercent: number
  lastActive: string
  records: {
    courseTitle: string
    courseId: string
    listenedTime: number
    totalDuration: number
    percent: number
    completed: boolean
    notes: string
    lastUpdated: string
    listenedAt?: string
    lecturer?: string
  }[]
}

// ?? Emits ?????????????????????????????????????????????????????????????????????

const emit = defineEmits<{
  'view-student': [student: StudentProgressSummary]
  'manage-student': [username: string]
  'unmanage-student': [username: string]
}>()

// ?? Stores ????????????????????????????????????????????????????????????????????

const authStore = useAuthStore()
const coursesStore = useCoursesStore()
const { t } = useI18n()

// ?? State ?????????????????????????????????????????????????????????????????????

const currentTab = ref<'my-students' | 'all-students'>('my-students')
const searchQuery = ref('')

// ?? Watch role changes ????????????????????????????????????????????????????????

watch(() => authStore.currentUser?.role, (role) => {
  if (role === 'parent') {
    currentTab.value = 'my-students'
  } else if (role === 'pastor' || role === 'admin') {
    currentTab.value = 'all-students'
  }
}, { immediate: true })

// ?? Students Data (via shared composable) ?????????????????????????????????????

const { studentsList } = useStudentList()
const myStudentsCount = computed(() => {
  const currentUserRole = authStore.currentUser?.role
  const currentUsername = authStore.currentUser?.username
  return studentsList.value.filter(s => {
    if (currentUserRole === 'teacher' || currentUserRole === 'pastor' || currentUserRole === 'parent') {
      return coursesStore.getStudentCaretaker(s.username, currentUserRole) === currentUsername
    }
    return false
  }).length
})

const filteredStudents = computed(() => {
  let list = studentsList.value
  const currentUserRole = authStore.currentUser?.role
  const currentUsername = authStore.currentUser?.username

  if (currentUserRole !== 'parent' && currentTab.value === 'my-students') {
    list = list.filter(student => {
      if (currentUserRole === 'teacher' || currentUserRole === 'pastor') {
        return coursesStore.getStudentCaretaker(student.username, currentUserRole) === currentUsername
      }
      return true
    })
  }

  return list.filter(student =>
    student.username.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
})

// ?? Helper Functions ??????????????????????????????????????????????????????????

function isStudentManaged(studentUsername: string): boolean {
  if (!authStore.currentUser) return false
  const role = authStore.currentUser.role
  if (role === 'teacher' || role === 'pastor' || role === 'parent') {
    return coursesStore.getStudentCaretaker(studentUsername, role) === authStore.currentUser.username
  }
  return false
}

function getCaretakerStatusText(studentUsername: string): string {
  const role = authStore.currentUser?.role
  if (role === 'teacher') {
    const tc = coursesStore.getStudentCaretaker(studentUsername, 'teacher')
    return tc === authStore.currentUser?.username
      ? t('teacher.studentList.youManage')
      : (tc ? t('teacher.studentList.managedBy', { name: tc }) : t('teacher.studentList.noManager'))
  } else if (role === 'pastor') {
    const p = coursesStore.getStudentCaretaker(studentUsername, 'pastor')
    return p === authStore.currentUser?.username
      ? t('teacher.studentList.youPastor')
      : (p ? t('teacher.studentList.pastoredBy', { name: p }) : t('teacher.studentList.noPastor'))
  } else if (role === 'parent') {
    const pa = coursesStore.getStudentCaretaker(studentUsername, 'parent')
    return pa === authStore.currentUser?.username
      ? t('teacher.studentList.youParent')
      : (pa ? t('teacher.studentList.caredBy', { name: pa }) : t('teacher.studentList.noCarer'))
  }
  const tc = coursesStore.getStudentCaretaker(studentUsername, 'teacher')
  return tc ? t('teacher.studentList.managedBy', { name: tc }) : t('teacher.studentList.noAssigned')
}

function getCaretakerBadgeClass(studentUsername: string): string {
  const role = authStore.currentUser?.role
  const val = coursesStore.getStudentCaretaker(studentUsername, role as any)
  if (val === authStore.currentUser?.username) return 'badge-teacher'
  if (val) return 'badge-admin'
  return 'badge-student'
}
</script>
