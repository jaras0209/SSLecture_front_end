import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import vueParser from 'vue-eslint-parser'
import prettierConfig from '@vue/eslint-config-prettier'

export default [
  // Base JS rules
  js.configs.recommended,

  // Vue files
  ...pluginVue.configs['flat/recommended'],

  // TypeScript inside Vue and .ts files
  {
    files: ['**/*.vue', '**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    },
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript — discourage unbounded any
      '@typescript-eslint/no-explicit-any': 'warn',

      // Vue — enforce best practices
      'vue/multi-word-component-names': 'off',   // our components use single words (App, Login...)
      'vue/no-unused-vars': 'warn',
      'vue/require-v-for-key': 'error',
      'vue/no-use-v-if-with-v-for': 'error',

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'prefer-const': 'error',
      'no-var': 'error'
    }
  },

  // Prettier must be last to override conflicting rules
  prettierConfig,

  // Files to ignore
  {
    ignores: ['dist/**', 'node_modules/**', '*.d.ts', 'coverage/**']
  }
]
