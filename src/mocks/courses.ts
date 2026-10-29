/**
 * @file src/mocks/courses.ts
 * @description Development seed data for the course catalog.
 *
 * TODO（後端就緒後）：
 *   Replace `buildMockCourses()` in stores/courses.ts with a GET /courses API call
 *   and delete this file.
 */
import type { Course } from '@/types/courses'

/** Cover gradients, assigned cyclically by course index. */
const COVER_COLORS = [
  // Dark enough for the white text on top to meet WCAG AA at both ends of each gradient
  'linear-gradient(135deg, #1D4ED8 0%, #2563EB 100%)', // Blue
  'linear-gradient(135deg, #065F46 0%, #047857 100%)', // Green
  'linear-gradient(135deg, #92400E 0%, #B45309 100%)', // Amber
  'linear-gradient(135deg, #6D28D9 0%, #7C3AED 100%)', // Purple
  'linear-gradient(135deg, #9D174D 0%, #BE185D 100%)', // Pink
  'linear-gradient(135deg, #155E75 0%, #0E7490 100%)' // Cyan
]

const MOCK_SPEAKERS = ['張牧師', '陳傳道', '李長老', '林輔導', '王老師']
const MOCK_DURATIONS = [180, 240, 200, 300, 220] // 3 to 5 minutes list

const RAW_COURSES = [
  { title: '聖經時觀', category: 'bible' },
  { title: '日月停止', category: 'bible' },
  { title: '彼得與釣魚', category: 'bible' },
  { title: '以利亞與烏鴉飯', category: 'bible' },
  { title: '三分說', category: 'bible' },
  { title: '七階段法則', category: 'bible' },
  { title: '火之概念', category: 'bible' },
  { title: '末世論', category: 'bible' },
  { title: '比喻論', category: 'bible' },
  { title: '洪水審判', category: 'bible' },
  { title: '無知中的相剋世界', category: 'bible' },
  { title: '預定論', category: 'bible' },
  { title: '異端的概念', category: 'bible' },
  { title: '中心人物論', category: 'bible' },
  { title: '復活論', category: 'bible' },
  { title: '三位一體', category: 'lecture' },
  { title: '聖子論', category: 'lecture' },
  { title: '再臨論', category: 'lecture' },
  { title: '空提論', category: 'lecture' },
  { title: '啟示論', category: 'lecture' },
  { title: '靈界論', category: 'lecture' },
  { title: '撒旦論', category: 'lecture' },
  { title: '該隱的個性', category: 'lecture' },
  { title: '罪與悔改', category: 'lecture' },
  { title: '創造目的', category: 'lecture' },
  { title: '墮落論', category: 'lecture' },
  { title: '施洗約翰與耶穌的關係使命', category: 'lecture' },
  { title: '兩棵橄欖樹與兩個見證人', category: 'lecture' },
  { title: '歷史論', category: 'lecture' },
  { title: '一載二載半載', category: 'lecture' }
] as const

/**
 * Build the seeded course list. IDs are `${category}-${NN}` using the
 * 1-based position in RAW_COURSES — keep the order stable, because saved
 * progress in localStorage is keyed by these IDs.
 */
export function buildMockCourses(): Course[] {
  return RAW_COURSES.map((item, index) => {
    const id = `${item.category}-${(index + 1).toString().padStart(2, '0')}`
    return {
      id,
      title: item.title,
      category: item.category,
      speaker: MOCK_SPEAKERS[index % MOCK_SPEAKERS.length],
      duration: MOCK_DURATIONS[index % MOCK_DURATIONS.length],
      description: `精選聖經專題，帶您深入探討「${item.title}」的屬靈含義、歷史背景與信仰實踐。`,
      coverColor: COVER_COLORS[index % COVER_COLORS.length]
    }
  })
}
