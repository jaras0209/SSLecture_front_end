/**
 * @file src/types/student.ts
 * @description Shared type definitions for student-related data structures.
 *
 * Centralizing types here prevents circular dependencies between composables
 * and UI components (e.g. useStudentList importing from TeacherStudentList.vue).
 */

/**
 * Aggregated progress summary for a single student.
 * Consumed by TeacherStudentList, TeacherStudentDrawer, and useStudentList.
 */
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
