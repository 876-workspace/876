import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    clearMocks: true,
    environment: 'node',
    exclude: ['src/**/*.browser.test.{ts,tsx}'],
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
