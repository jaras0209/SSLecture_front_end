import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCoursesStore } from '@/stores/courses'
import type { StudentProgressSummary } from '@/types/student'
import { defaultAvatarUrl } from '@/utils/avatar'
import { visibleStudents } from '@/utils/scope'

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
    const me = authStore.currentUser

    // 1. Which students this user may see (rules in utils/scope.ts); usernames that only
    //    have progress records (legacy, no account) are candidates too
    const usernames = visibleStudents(
      {
        username: me?.username ?? '',
        role: me?.role ?? 'student',
        church: me?.church,
        // From the account, so a pastor's change applies without signing in again
        childUsernames: me ? authStore.childrenOf(me.username) : []
      },
      authStore.usersDb,
      Object.keys(coursesStore.progressDb)
    )

    // 2. For each username, calculate completion metrics
    usernames.forEach((username) => {
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
        avatarUrl: authStore.usersDb[username]?.avatarUrl || defaultAvatarUrl(username),
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
