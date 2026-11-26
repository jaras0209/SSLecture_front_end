import { defineConfig, devices } from '@playwright/test'

const PORT = 4174
const BASE_URL = `http://localhost:${PORT}/SSLecture_front_end/`

/** The backend these tests talk to (SSLecture_backend, started separately; see e2e-backend/README.md) */
export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080'

/**
 * End-to-end tests of the front end built to use the backend (VITE_DEMO_MODE=false), against a
 * running SSLecture_backend. CI starts the backend first (.github/workflows/backend-e2e.yml).
 * Files are named *.backend.ts so neither Vitest nor the demo E2E run picks them up.
 */
export default defineConfig({
  testDir: './e2e-backend',
  testMatch: '**/*.backend.ts',
  // One at a time: the tests share the backend (and its per-IP attempt limits)
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: BASE_URL,
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      `npx vite build --outDir dist-backend --emptyOutDir && ` +
      `npx vite preview --outDir dist-backend --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { VITE_DEMO_MODE: 'false', VITE_API_BASE_URL: API_URL }
  }
})
