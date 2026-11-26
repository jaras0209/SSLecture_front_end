/**
 * @file backendMode.ts
 * @description 是否接上真正的後端（SSLecture_backend）。
 *
 * `VITE_DEMO_MODE=false` 且設定了 `VITE_API_BASE_URL` 時，登入、註冊、登出、修改密碼與個人資料改呼叫後端
 * （後端第一階段計畫的步驟 1，見 docs/backend_phase1_plan.md）；其他資料仍存在瀏覽器裡，依計畫逐步改接。
 * 其餘情況（GitHub Pages 的示範站、`npm run dev`）維持在瀏覽器裡模擬。
 */
export function usesBackend(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'false' && !!import.meta.env.VITE_API_BASE_URL
}
