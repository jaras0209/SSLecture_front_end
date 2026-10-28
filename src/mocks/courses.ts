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
  'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)', // Blue
  'linear-gradient(135deg, #10B981 0%, #34D399 100%)', // Green
  'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', // Yellow
  'linear-gradient(135deg, #8B5CF6 0%, #A78BFA 100%)', // Purple
  'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', // Pink
  'linear-gradient(135deg, #06B6D4 0%, #22D3EE 100%)' // Cyan
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
