import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src'),
      'server-only': resolve(import.meta.dirname, './src/test/server-only.ts'),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    setupFiles: ['./src/test/setup.ts'],
    env: {
      ENVIRONMENT: 'test',
      LOG_LEVEL: 'silent',
      IS_PRODUCTION: 'false',
      DATABASE_URL: 'prisma://127.0.0.1:1/?api_key=test',
      DIRECT_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      PORT: '4001',
      API_876_KEY: '876_app_secret_test_key_for_couriers_api',
      API_INTERNAL_KEY: 'test-internal-key',
      SENTRY_DSN: '',
    },
    isolate: true,
  },
})
