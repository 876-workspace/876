import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'server-only': fileURLToPath(
        new URL('./src/test/server-only-stub.ts', import.meta.url)
      ),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
