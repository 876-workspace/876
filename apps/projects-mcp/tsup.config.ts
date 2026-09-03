import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  noExternal: ['@876/projects'],
  esbuildOptions(options) {
    options.conditions = [...(options.conditions ?? []), 'react-server']
  },
  banner: {
    js: '#!/usr/bin/env node',
  },
})
