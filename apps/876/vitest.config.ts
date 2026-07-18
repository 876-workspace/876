import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      'server-only': resolve(
        '../../node_modules/next/dist/compiled/server-only/empty.js'
      ),
      'client-only': resolve(
        '../../node_modules/next/dist/compiled/client-only/index.js'
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
