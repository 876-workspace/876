import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test/setup.ts'],
    // Modules share one Prisma client and one in-memory rate-limit store, so
    // parallel files would race on the same state. Threads stay enabled for
    // speed; isolation keeps each file's module registry its own.
    isolate: true,
  },
})
