/**
 * 預約場次相關型別定義
 *
 * 集中管理 bookings domain 的所有型別，供 stores、views、components、utils 共用。
 * 原先定義於 src/stores/bookings.ts，v1.6.0 起抽離至此。
 */

/** 預約場次狀態 */
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled'

/** 出席狀態 */
export type AttendanceStatus = 'invited' | 'attended' | 'absent'

/** 場次預習資料 */
export interface BookingPrep {
  scriptures: string[]  // 預習經文，如 ["約翰福音 1:1-18"]
  readingNotes: string  // 閱讀/準備說明
  materials: string     // 補充材料說明
}

/** 預約場次 */
export interface BookingSession {
  id: string

  // 課程
  courseId: string
  courseTitle: string       // 冗餘，方便顯示

  // 講師
  lecturerId: string
  lecturerName: string
  lecturerTitle: string     // 牧師/傳道/長老等

  // 發起教師
  teacherUsername: string

  // 時間
  proposedAt: string        // ISO8601，如 "2025-06-25T14:00"
  confirmedAt?: string      // 最終確認時間（講師確認後填）
  durationMinutes: number   // 預計時長（分鐘），如 90

  // 狀態
  status: BookingStatus
  cancelReason?: string

  // 預習內容
  prep: BookingPrep

  // 完成後場次整體記錄（教師填）
  teacherSessionNotes: string

  // 系統
  church: string
  isGroupSession: boolean
  createdAt: string
  updatedAt: string
}

/** 場次學員出席記錄 */
export interface BookingAttendee {
  id: string              // `att_${sessionId}_${studentUsername}`
  sessionId: string

  studentUsername: string

  // 出席狀態（教師事後填）
  attendanceStatus: AttendanceStatus

  // 課後回饋
  studentFeedback: string   // 學員心得（學員或教師代填）
  teacherFeedback: string   // 教師對此學員的個別回饋
  feedbackAt?: string

  // 手動連結聽課紀錄（選填）
  linkedListenSessionId?: string

  createdAt: string
  updatedAt: string
}

/** 場次資料庫型別 */
export type BookingSessionsDb = Record<string, BookingSession>

/** 學員出席記錄資料庫型別 */
export type BookingAttendeesDb = Record<string, BookingAttendee>
