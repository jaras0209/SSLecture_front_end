import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

// Dedicated Vitest configuration — separate from vite.config.ts to avoid
// type conflicts between vite and vitest's bundled vite copy during vue-tsc build.
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/main.ts' // 入口檔案，無法在單元測試中有效覆蓋
      ],
      // 最低覆蓋率：設在目前數值（2026-11 約 93 / 86 / 87 / 93.8）略低一點，
      // 新功能沒寫測試、讓覆蓋率下降時 CI 會失敗。覆蓋率上升後可以跟著調高，不要調低
      thresholds: {
        statements: 92,
        branches: 85,
        functions: 86,
        lines: 93
      }
    }
  }
})
