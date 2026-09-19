import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/server.ts', 'src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  external: ['@prisma/client', '.prisma/client'],
  noExternal: ['@876/core', '@876/billing', '@876/work'],
  esbuildOptions(options) {
    options.conditions = [...(options.conditions ?? []), 'react-server']
  },
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module'",
      'const require = __createRequire(import.meta.url)',
    ].join('\n'),
  },
})
