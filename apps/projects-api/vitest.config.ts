import { resolve } from 'node:path'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      'server-only': resolve(import.meta.dirname, './src/test/server-only.ts'),
    },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    // Set here rather than in a setup file: repositories import the database
    // client at module load, which throws when the connection string is
    // missing. Tests mock every repository, so nothing is ever dialed — the
    // closed port below only satisfies import-time client construction.
    env: {
      PROJECTS_DATABASE_URL: 'postgresql://test:test@127.0.0.1:1/test',
    },
    isolate: true,
  },
})
