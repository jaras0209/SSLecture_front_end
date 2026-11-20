/**
 * @file src/stores/parts/courseFeedback.ts
 * @description The courses store's replies to students' notes (心得回覆) and what each
 * student has seen of them.
 */
import type { Ref } from 'vue'
import type { CourseFeedback, CourseFeedbackDb } from '@/types/courses'
import { createId } from '@/utils/id'
import { nowIso } from '@/utils/datetime'
import { MAX_LENGTH } from '@/utils/limits'

export function createCourseFeedback({
  feedbackDb,
  feedbackSeenDb
}: {
  feedbackDb: Ref<CourseFeedbackDb>
  feedbackSeenDb: Ref<Record<string, Record<string, string>>>
}) {
  /** Replies to `student`'s notes on `courseId`, oldest first */
  function getFeedback(student: string, courseId: string): CourseFeedback[] {
    return feedbackDb.value[student]?.[courseId] ?? []
  }

  /** When `student` last looked at the replies on `courseId` ('' if never) */
  function feedbackSeenAt(student: string, courseId: string): string {
    return feedbackSeenDb.value[student]?.[courseId] ?? ''
  }

  /** Replies on `courseId` that `student` hasn't seen yet */
  function unreadFeedback(student: string, courseId: string): CourseFeedback[] {
    const seen = feedbackSeenAt(student, courseId)
    return getFeedback(student, courseId).filter((f) => f.createdAt > seen)
  }

  /** Courses with replies `student` hasn't seen yet */
  function coursesWithUnreadFeedback(student: string): string[] {
    return Object.keys(feedbackDb.value[student] ?? {}).filter(
      (courseId) => unreadFeedback(student, courseId).length > 0
    )
  }

  /** `student` has now seen every reply on `courseId` */
  function markFeedbackSeen(student: string, courseId: string): void {
    const unread = unreadFeedback(student, courseId)
    if (unread.length === 0) return
    const byCourse = (feedbackSeenDb.value[student] ??= {})
    // The newest reply's own time, so the mark doesn't depend on clocks agreeing
    byCourse[courseId] = unread.reduce((t, f) => (f.createdAt > t ? f.createdAt : t), '')
  }

  /**
   * Reply to a student's notes on a course. Blank replies, and ones longer than the limit
   * (MAX_LENGTH.feedbackReply, as the API), are not saved: returns undefined.
   */
  function addFeedback(
    student: string,
    courseId: string,
    author: string,
    message: string
  ): CourseFeedback | undefined {
    const text = message.trim()
    if (!text || text.length > MAX_LENGTH.feedbackReply) return undefined
    const entry: CourseFeedback = { id: createId('fb'), author, message: text, createdAt: nowIso() }
    const byCourse = (feedbackDb.value[student] ??= {})
    byCourse[courseId] = [...(byCourse[courseId] ?? []), entry]
    return entry
  }

  return {
    getFeedback,
    addFeedback,
    feedbackSeenAt,
    unreadFeedback,
    coursesWithUnreadFeedback,
    markFeedbackSeen
  }
}
