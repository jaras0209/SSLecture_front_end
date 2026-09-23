import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { StudentProgressSummary } from '@/components/teacher/TeacherStudentList.vue'

/**
 * useStudentList — shared composable for teacher/pastor/parent views.
 *
 * Builds a reactive list of StudentProgressSummary objects based on the
 * current user's role and church. Eliminates duplicate logic that previously
 * existed in both TeacherDashboard.vue and TeacherStudentList.vue.
 *
 * Usage:
 *   const { studentsList } = useStudentList()
 */
export function useStudentList() {
  const authStore = useAuthStore()
  const coursesStore = useCoursesStore()

  const studentsList = computed<StudentProgressSummary[]>(() => {
    const students: StudentProgressSummary[] = []
    const currentUserRole = authStore.currentUser?.role
    const currentChurch = authStore.currentUser?.church
    const childUsernames = authStore.currentUser?.childUsernames || []

    // 1. Determine which usernames to include based on role
    const usernamesSet = new Set<string>()

    if (currentUserRole === 'parent') {
      // Parent: only their bound children
      childUsernames.forEach((u) => usernamesSet.add(u))
    } else {
      // Teacher / Pastor: gather student accounts from SAME church
      Object.keys(authStore.usersDb).forEach((username) => {
        const user = authStore.usersDb[username]
        if (user.role === 'student') {
          const sameChurch = !currentChurch || user.church === currentChurch
          if (sameChurch) usernamesSet.add(username)
        }
      })
      // Also include students who have progress records but may not be in usersDb
      // (only if their church matches or if we don't know their church)
      Object.keys(coursesStore.progressDb).forEach((username) => {
        if (usernamesSet.has(username)) return
        const userInDb = authStore.usersDb[username]
        if (!userInDb) {
          // Legacy record without usersDb entry
          if (!currentChurch) usernamesSet.add(username)
        }
      })
    }

    // 2. For each username, calculate completion metrics
    usernamesSet.forEach((username) => {
      const records: StudentProgressSummary['records'] = []
      let totalCompleted = 0
      let lastActiveTime = ''
      let totalProgressSum = 0

      coursesStore.courses.forEach((course) => {
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

      const totalProgressPercent =
        coursesStore.courses.length > 0
          ? Math.round(totalProgressSum / coursesStore.courses.length)
          : 0

      students.push({
        username,
        realName: authStore.usersDb[username]?.realName,
        avatarUrl:
          authStore.usersDb[username]?.avatarUrl ||
          `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}`,
        completedCount: totalCompleted,
        totalProgressPercent,
        lastActive: lastActiveTime,
        records
      })
    })

    return students
  })

  return { studentsList }
}
