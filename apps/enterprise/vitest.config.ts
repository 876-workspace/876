import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve('./src'),
      'server-only': resolve(
        '../../node_modules/next/dist/compiled/server-only/empty.js'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['@testing-library/jest-dom/vitest'],
  },
})
