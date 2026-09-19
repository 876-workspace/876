import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      '@': resolve('./src'),
      'server-only': resolve(
        '../../node_modules/next/dist/compiled/server-only/empty.js'
      ),
      'client-only': resolve(
        '../../node_modules/next/dist/compiled/client-only/index.js'
      ),
      // vi.mock keys on the resolved module id. Without this, a component in
      // @876/ui resolves next/navigation through its own node_modules link and
      // escapes an app-level mock, so rendering any shared client component
      // reaches the real useRouter and throws "expected app router to be
      // mounted". Pinning one id makes the mock cover the whole graph.
      'next/navigation': resolve('../../node_modules/next/navigation.js'),
    },
  },
  test: {
    clearMocks: true,
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
