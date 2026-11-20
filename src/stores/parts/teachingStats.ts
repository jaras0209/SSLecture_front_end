/**
 * @file src/stores/parts/teachingStats.ts
 * @description The courses store's yearly teaching statistics (年度教學人次申報).
 */
import type { Ref } from 'vue'
import type { TeachingStats, TeachingStatsDb } from '@/types/courses'
import { nowIso } from '@/utils/datetime'

export function createTeachingStats({
  teachingStatsDb
}: {
  teachingStatsDb: Ref<TeachingStatsDb>
}) {
  // ── Teaching Stats Actions ──────────────────────────────

  /**
   * 教師填報或更新某年度的教學人次統計
   */
  function saveTeachingStats(
    teacherUsername: string,
    year: number,
    church: string,
    stats: Omit<TeachingStats, 'teacherUsername' | 'year' | 'church' | 'submittedAt'>
  ): void {
    const key = `${teacherUsername}_${year}`
    teachingStatsDb.value[key] = {
      teacherUsername,
      year,
      church,
      ...stats,
      submittedAt: nowIso()
    }
  }

  /**
   * 取得指定教師在某年度的統計（若無則回傳預設空值）
   */
  function getTeachingStats(teacherUsername: string, year: number): TeachingStats {
    const key = `${teacherUsername}_${year}`
    return (
      teachingStatsDb.value[key] ?? {
        teacherUsername,
        year,
        church: '',
        oneOnOne30: 0,
        oneToMany30: 0,
        oneOnOneShining: 0,
        oneToManyShining: 0
      }
    )
  }

  /**
   * 取得所有教師的統計（可選年份篩選）；SS 中央用
   */
  function getAllTeachingStats(year?: number): TeachingStats[] {
    const all = Object.values(teachingStatsDb.value)
    if (year !== undefined) {
      return all.filter((s) => s.year === year)
    }
    return all
  }

  return { saveTeachingStats, getTeachingStats, getAllTeachingStats }
}
