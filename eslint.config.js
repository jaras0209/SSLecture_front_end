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

  // Parsers: <script lang="ts"> in .vue goes through vue-eslint-parser → TS parser;
  // plain .ts files use the TS parser directly
  {
    files: ['**/*.vue'],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  },

  // TypeScript inside Vue and .ts files
  {
    files: ['**/*.vue', '**/*.ts', '**/*.tsx'],
    plugins: {
      '@typescript-eslint': tseslint
    },
    rules: {
      // TypeScript already reports undefined identifiers (and knows DOM/Node globals);
      // the core rule doesn't understand types and flags window, fetch, setTimeout, etc.
      'no-undef': 'off',

      // The core rule flags parameter names inside function *types*; use the TS-aware one.
      // Prefix intentionally unused params/vars with _ (e.g. _from, _code).
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }
      ],

      // TypeScript — discourage unbounded any
      '@typescript-eslint/no-explicit-any': 'warn',

      // Vue — enforce best practices
      'vue/multi-word-component-names': 'off', // our components use single words (App, Login...)
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

  // The codebase is fully Prettier-formatted — fail lint on formatting drift
  {
    rules: {
      'prettier/prettier': 'error'
    }
  },

  // Files to ignore
  {
    ignores: ['dist/**', 'node_modules/**', '**/*.d.ts', 'coverage/**']
  }
]
