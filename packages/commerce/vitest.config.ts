import path from 'node:path'
import { defineConfig } from 'vitest/config'
export default defineConfig({
  resolve: {
    alias: { 'server-only': path.resolve('src/test/server-only.ts') },
  },
  test: { environment: 'node' },
})
