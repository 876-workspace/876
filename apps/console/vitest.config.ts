import { resolve } from 'node:path'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: [
      { find: '@', replacement: resolve('./src') },
      {
        find: 'server-only',
        replacement: resolve(
          '../../node_modules/next/dist/compiled/server-only/empty.js'
        ),
      },
      {
        find: 'client-only',
        replacement: resolve(
          '../../node_modules/next/dist/compiled/client-only/index.js'
        ),
      },
      // `packages/ui` and `packages/projects-ui` each import `next/navigation`
      // with no local `next` of their own (or their own peer/dev pin), so pnpm
      // resolves them against whichever `next@16.3.1` build hoists to a given
      // directory. That can be a DIFFERENT physical copy than this app's own
      // (root `node_modules/next` and `apps/console/node_modules/next` have
      // resolved to two distinct pnpm builds here), and Vite caches a bare
      // `next/navigation` resolution per test run — so the first file that
      // imports it decides which copy every other file gets too. Force every
      // `next`/`next/*` import in this app's test graph to this app's own
      // resolved copy so `vi.mock('next/navigation', ...)` always intercepts
      // the same module `ResourceToolbar` (and everything else) actually runs.
      { find: /^next\//, replacement: resolve('./node_modules/next') + '/' },
      { find: 'next', replacement: resolve('./node_modules/next') },
    ],
  },
  test: {
    clearMocks: true,
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
  },
})
