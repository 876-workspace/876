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
    // Set here rather than in a setup file: modules call getLogger() and read
    // settings at *import* time, which happens before any beforeAll hook runs.
    // A setup file would configure the logger after it had already been built.
    env: {
      ENVIRONMENT: 'test',
      LOG_LEVEL: 'silent',
      IS_PRODUCTION: 'false',
      API_INTERNAL_KEY: 'test-internal-key',
      SESSION_COOKIE_SECRET: 'test-session-cookie-secret-32-chars!!',
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
    // Modules share one Prisma client and one in-memory rate-limit store, so
    // parallel files would race on the same state. Threads stay enabled for
    // speed; isolation keeps each file's module registry its own.
    isolate: true,
  },
})
