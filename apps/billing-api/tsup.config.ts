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
  // Workspace packages publish TypeScript sources, so anything left external is
  // resolved as .ts at runtime and Node cannot load it — the built service fails
  // to boot with ERR_MODULE_NOT_FOUND. Every @876/* runtime dependency must be
  // bundled.
  noExternal: ['@876/core', '@876/server', '@876/communications'],
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
