import { defineConfig } from 'tsup'
export default defineConfig({
  entry: ['src/index.ts', 'src/server.ts'],
  format: ['esm'],
  sourcemap: true,
  clean: true,
  target: 'node22',
})
