import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/SSLecture_front_end/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2022', // 現代瀏覽器，對應 Node.js v22 開發環境
    rollupOptions: {
      output: {
        /**
         * Vendor Chunk 分割策略
         * 將穩定的第三方套件獨立打包，讓瀏覽器可長效快取
         * 應用程式更新時，使用者只需重新下載 app chunk，不需重下 vendor
         */
        manualChunks(id) {
          // Vue 核心生態系 → vue-vendor chunk
          if (id.includes('node_modules/vue') ||
              id.includes('node_modules/@vue') ||
              id.includes('node_modules/vue-router') ||
              id.includes('node_modules/pinia')) {
            return 'vue-vendor'
          }
          // 其他 node_modules → vendor chunk（未來若新增 lodash、dayjs 等也會進來）
          if (id.includes('node_modules')) {
            return 'vendor'
          }
        }
      }
    }
  }
})
