import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { contentSecurityPolicy } from './src/utils/csp'

/** The npm package a module belongs to (e.g. 'vue', '@vue/runtime-core'), if any */
function packageOf(id: string): string | undefined {
  const m = /[\\/]node_modules[\\/]((?:@[^\\/]+[\\/])?[^\\/]+)/.exec(id)
  return m?.[1].replace('\\', '/')
}

/**
 * Put the Content-Security-Policy into the built index.html (see src/utils/csp.ts). Build only:
 * the dev server's hot reload needs inline scripts the policy would block.
 */
function contentSecurityPolicyMeta(apiBaseUrl: string | undefined): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: {
          'http-equiv': 'Content-Security-Policy',
          content: contentSecurityPolicy(apiBaseUrl)
        },
        injectTo: 'head-prepend'
      }
    ]
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/SSLecture_front_end/',
  plugins: [vue(), contentSecurityPolicyMeta(loadEnv(mode, process.cwd()).VITE_API_BASE_URL)],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  build: {
    target: 'es2022', // 現代瀏覽器，對應 Node.js v22 開發環境
    rolldownOptions: {
      output: {
        /**
         * Vendor Chunk 分割策略
         * 將穩定的第三方套件獨立打包，讓瀏覽器可長效快取
         * 應用程式更新時，使用者只需重新下載 app chunk，不需重下 vendor
         */
        codeSplitting: {
          // Higher priority claims a module first, so Vue stays in vue-vendor even though
          // vue-i18n (and everything else) depends on it
          groups: [
            {
              // Vue 核心生態系 → vue-vendor chunk
              name: 'vue-vendor',
              test: (id) => {
                const pkg = packageOf(id)
                return (
                  !!pkg && (['vue', 'vue-router', 'pinia'].includes(pkg) || pkg.startsWith('@vue/'))
                )
              },
              priority: 30
            },
            {
              // vue-i18n → 獨立 chunk，語系檔更新時不影響其他 vendor 快取
              name: 'i18n',
              test: (id) => {
                const pkg = packageOf(id)
                return pkg === 'vue-i18n' || !!pkg?.startsWith('@intlify/')
              },
              priority: 20
            },
            {
              // 其他 node_modules → vendor chunk（未來若新增 lodash、dayjs 等也會進來）；
              // DiceBear 頭像風格按需載入（src/utils/avatar.ts），依動態 import 自然拆分
              name: 'vendor',
              test: (id) => {
                const pkg = packageOf(id)
                return !!pkg && !pkg.startsWith('@dicebear/')
              },
              priority: 10
            }
          ]
        }
      }
    }
  }
}))
