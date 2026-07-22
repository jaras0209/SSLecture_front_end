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
          🛡️ 我負責的學員 ({{ myStudentsCount }})
        </button>
        <button
          :class="['tab-btn', { active: currentTab === 'all-students' }]"
          @click="currentTab = 'all-students'"
        >
          👥 全體學員名冊
        </button>
      </div>
      <div v-else class="tab-selectors-parent-title">
        <h3 style="margin: 0; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem; color: var(--primary);">
          👨‍👩‍👦 我的孩子進度一覽
        </h3>
      </div>
      <input
        v-model="searchQuery"
        type="text"
        class="form-input search-input"
        placeholder="🔍 搜尋學員姓名..."
        v-if="authStore.currentUser?.role !== 'parent'"
      />
    </div>

    <div class="table-container mt-4">
      <table class="students-table">
        <thead>
          <tr>
            <th>學員姓名</th>
            <th>管理狀態</th>
            <th>已聽完課堂</th>
            <th>總聽課進度</th>
            <th>操作項目</th>
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
                  🔍 檢視進度
                </button>

                <template v-if="authStore.currentUser?.role !== 'parent'">
                  <button
                    v-if="isStudentManaged(student.username) && authStore.currentUser?.role === 'teacher'"
                    @click="emit('unmanage-student', student.username)"
                    class="btn btn-danger btn-sm"
                  >
                    ❌ 取消管理
                  </button>
                  <button
                    v-else-if="!coursesStore.getStudentCaretaker(student.username, authStore.currentUser?.role as any) && authStore.currentUser?.role === 'teacher'"
                    @click="emit('manage-student', student.username)"
                    class="btn btn-primary btn-sm"
                  >
                    🤝 加入管理
                  </button>
                </template>
              </div>
            </td>
          </tr>
          <tr v-if="filteredStudents.length === 0">
            <td colspan="5" class="text-center empty-row">
              目前列表沒有學員喔！
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'

// ── Types ─────────────────────────────────────────────────────────────────────

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

// ── Emits ─────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  'view-student': [student: StudentProgressSummary]
  'manage-student': [username: string]
  'unmanage-student': [username: string]
}>()

// ── Stores ────────────────────────────────────────────────────────────────────

const authStore = useAuthStore()
const coursesStore = useCoursesStore()

// ── State ─────────────────────────────────────────────────────────────────────

const currentTab = ref<'my-students' | 'all-students'>('my-students')
const searchQuery = ref('')

// ── Watch role changes ────────────────────────────────────────────────────────

watch(() => authStore.currentUser?.role, (role) => {
  if (role === 'parent') {
    currentTab.value = 'my-students'
  } else if (role === 'pastor' || role === 'admin') {
    currentTab.value = 'all-students'
  }
}, { immediate: true })

// ── Students Data ─────────────────────────────────────────────────────────────

const studentsList = computed<StudentProgressSummary[]>(() => {
  const students: StudentProgressSummary[] = []
  const currentUserRole = authStore.currentUser?.role
  const currentChurch = authStore.currentUser?.church
  const childUsernames = authStore.currentUser?.childUsernames || []

  const usernamesSet = new Set<string>()

  if (currentUserRole === 'parent') {
    childUsernames.forEach(u => usernamesSet.add(u))
  } else {
    Object.keys(authStore.usersDb).forEach(username => {
      const user = authStore.usersDb[username]
      if (user.role === 'student') {
        const sameChurch = !currentChurch || user.church === currentChurch
        if (sameChurch) usernamesSet.add(username)
      }
    })
    Object.keys(coursesStore.progressDb).forEach(username => {
      if (usernamesSet.has(username)) return
      const userInDb = authStore.usersDb[username]
      if (!userInDb && !currentChurch) usernamesSet.add(username)
    })
  }

  usernamesSet.forEach(username => {
    const records: StudentProgressSummary['records'] = []
    let totalCompleted = 0
    let lastActiveTime = ''
    let totalProgressSum = 0

    coursesStore.courses.forEach(course => {
      const record = coursesStore.getStudentProgress(username, course.id)
      const percent = record.completed ? 100 : 0
      if (record.completed) totalCompleted++
      if (record.lastUpdated && (!lastActiveTime || record.lastUpdated > lastActiveTime)) {
        lastActiveTime = record.lastUpdated
      }
      totalProgressSum += percent
      records.push({
        courseTitle: course.title,
        courseId: course.id,
        listenedTime: record.durationListened ?? 0,
        totalDuration: course.duration,
        percent,
        completed: record.completed,
        notes: record.notes,
        lastUpdated: record.lastUpdated,
        listenedAt: record.listenedAt,
        lecturer: record.lecturer
      })
    })

    const totalProgressPercent = coursesStore.courses.length > 0
      ? Math.round(totalProgressSum / coursesStore.courses.length)
      : 0

    students.push({
      username,
      realName: authStore.usersDb[username]?.realName,
      avatarUrl: authStore.usersDb[username]?.avatarUrl || `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}`,
      completedCount: totalCompleted,
      totalProgressPercent,
      lastActive: lastActiveTime,
      records
    })
  })

  return students
})

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

// ── Helper Functions ──────────────────────────────────────────────────────────

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
    const t = coursesStore.getStudentCaretaker(studentUsername, 'teacher')
    return t === authStore.currentUser?.username ? '🛡️ 您負責輔導' : (t ? `由 ${t} 輔導` : '無管理輔導')
  } else if (role === 'pastor') {
    const p = coursesStore.getStudentCaretaker(studentUsername, 'pastor')
    return p === authStore.currentUser?.username ? '⛪ 您負責牧養' : (p ? `由 ${p} 牧養` : '無管理牧者')
  } else if (role === 'parent') {
    const pa = coursesStore.getStudentCaretaker(studentUsername, 'parent')
    return pa === authStore.currentUser?.username ? '👨‍👩‍👦 您負責關懷' : (pa ? `由 ${pa} 關懷` : '無管理家長')
  }
  const t = coursesStore.getStudentCaretaker(studentUsername, 'teacher')
  return t ? `由 ${t} 輔導` : '無指派人員'
}

function getCaretakerBadgeClass(studentUsername: string): string {
  const role = authStore.currentUser?.role
  const val = coursesStore.getStudentCaretaker(studentUsername, role as any)
  if (val === authStore.currentUser?.username) return 'badge-teacher'
  if (val) return 'badge-admin'
  return 'badge-student'
}
</script>
