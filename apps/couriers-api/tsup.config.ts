import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  external: ['@prisma/client', '.prisma/client'],
  // `@876/core` publishes raw TypeScript through its `exports` map, so nothing
  // resolves it at runtime. tsup treats every declared dependency as external
  // by default; inlining it is what makes the bundled service self-contained.
  noExternal: ['@876/core'],
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module'",
      'const require = __createRequire(import.meta.url)',
    ].join('\n'),
  },
})
