/**
 * 課程與學習進度相關型別定義
 *
 * 集中管理 courses domain 的所有型別，供 stores、views、components、utils 共用。
 * 原先定義於 src/stores/courses.ts，v1.6.0 起抽離至此。
 */

/** 課程資料 */
export interface Course {
  id: string
  title: string
  category: 'bible' | 'lecture'
  speaker: string
  duration: number      // 秒數
  description: string
  coverColor: string    // CSS color code 或 gradient（卡片樣式用）
}

/** 單次聽課紀錄 */
export interface ListenSession {
  id: string          // 唯一 session ID（以 timestamp 為基礎）
  lecturer: string    // 學員選擇的講師
  listenedAt: string  // 學員登記的聽課時間（YYYY-MM-DDTHH:mm）
  notes: string       // 本次的個人筆記
  createdAt: string   // 系統儲存時間戳記
}

/** 課程學習進度（含多次聽課紀錄） */
export interface ProgressRecord {
  courseId: string
  completed: boolean
  notes: string                 // 保留舊欄位（向下相容）
  lastUpdated: string
  sessions: ListenSession[]     // 所有聽課紀錄（多次紀錄）
  // 舊版欄位（遷移用，保留相容性）
  durationListened?: number
  listenedAt?: string
  lecturer?: string
}

/** 使用者學習進度資料庫型別 */
export type UserProgressDb = Record<string, Record<string, ProgressRecord>>

/** 頁面存取限制資料庫型別 */
export type PageRestrictionsDb = Record<string, string[]>

/** 學員的關懷配對（教師 / 牧者 / 家長） */
export interface StudentCaretakers {
  teacher?: string
  pastor?: string
  parent?: string
}

/** 學員關懷配對資料庫型別 */
export type StudentTeacherDb = Record<string, StudentCaretakers>

/** 閃耀計畫 */
export interface ShiningProject {
  name: string
  birthday: string
  church: string
  schoolGrade: string
  faithPhase1: {
    worship: boolean
    prayer: boolean
    independent: boolean
    reply: boolean
    share: boolean
  }
  faithPhase2: {
    courses30: boolean
    prayerLong: boolean
    morningWorship: boolean
    readBible: boolean
    churchService: boolean
  }
  advancedChallenges: {
    wednesday: boolean
    shareFaith: boolean
    copySermon: boolean
    morningProverb: boolean
    custom: boolean
  }
  customChallenge: string
  characterLectures: Record<string, { speaker: string; date: string }>
  comingOfAgeTopics: Record<string, { speaker: string; date: string }>
}

/** 閃耀計畫資料庫型別 */
export type ShiningProjectDb = Record<string, ShiningProject>

/** 講師資料 */
export interface Lecturer {
  id: string
  name: string
  title: string
  courseIds: string[]
  church?: string
  linkedUsername?: string   // 連結的教師帳號 username（選填）
}

/** 年度教學統計 */
export interface TeachingStats {
  teacherUsername: string
  year: number           // e.g. 2025
  church: string
  oneOnOne30: number          // 1對1講「三十個論」人次
  oneToMany30: number         // 1對多講「三十個論」人次
  oneOnOneShining: number     // 1對1講「閃耀計畫課程」人次
  oneToManyShining: number    // 1對多講「閃耀計畫課程」人次
  submittedAt?: string        // 最後更新時間
}

/** 教學統計資料庫型別 */
export type TeachingStatsDb = Record<string, TeachingStats>

/** 閃耀計畫勾選項目鍵值型別 */
export type ShiningChecklistKey =
  | 'worship' | 'prayer' | 'independent' | 'reply' | 'share'
  | 'courses30' | 'prayerLong' | 'morningWorship' | 'readBible'
  | 'churchService' | 'wednesday' | 'shareFaith' | 'copySermon'
  | 'morningProverb' | 'custom'
