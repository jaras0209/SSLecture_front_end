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
    // Each test file still gets its own fresh context, but the happy-dom environment is set up
    // once per worker rather than once per file (it took about half the run). Forks, not
    // threads: some tests switch process.env.TZ, which worker threads don't pick up.
    pool: 'vmForks',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.vue'],
      exclude: [
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/main.ts', // 入口檔案，無法在單元測試中有效覆蓋
        'src/router/**' // 路由守衛邏輯依賴瀏覽器環境
      ]
    }
  }
})
