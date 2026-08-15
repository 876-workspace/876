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
  // `@876/core` and `@876/settings` publish raw TypeScript through their
  // `exports` maps, so nothing resolves them at runtime. tsup treats every
  // declared dependency as external by default; inlining them is what makes
  // the bundled service self-contained.
  noExternal: ['@876/core', '@876/settings', '@876/billing', '@876/server'],
  esbuildOptions(options) {
    // `@876/core/platform` carries a side-effect `import 'server-only'`, whose
    // default Node entry throws on import by design — it exists to break a
    // client bundle that reaches for a server module. Inlining core therefore
    // put a throw at the top of `dist/server.js` and the container never became
    // healthy. `server-only` resolves to an empty module under the
    // `react-server` condition, which is exactly what a server bundle wants.
    options.conditions = [...(options.conditions ?? []), 'react-server']
  },
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module'",
      'const require = __createRequire(import.meta.url)',
    ].join('\n'),
  },
})
