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
      // Accelerate-shaped, because the config schema now requires it, but
      // pointed at a closed port so nothing is ever dialed. A real Accelerate
      // host here reaches the network and the engine's start promise rejects
      // outside any test's control (P6002), failing the run after every test
      // has already passed.
      DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
    },
    // Modules share one Prisma client and one in-memory rate-limit store, so
    // parallel files would race on the same state. Threads stay enabled for
    // speed; isolation keeps each file's module registry its own.
    isolate: true,
  },
})
