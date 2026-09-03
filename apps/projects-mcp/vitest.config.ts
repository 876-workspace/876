import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    conditions: ['react-server', 'node', 'import'],
    alias: {
      'server-only': resolve(
        import.meta.dirname,
        '../../packages/projects/node_modules/server-only/empty.js'
      ),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    isolate: true,
  },
})
