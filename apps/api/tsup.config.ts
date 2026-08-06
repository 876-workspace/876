import { defineConfig } from 'tsup'

/**
 * Bundles the service to a single ESM file for the container image.
 *
 * Bundling (rather than `tsc` + a runtime path resolver) is what lets the whole
 * codebase use the `@/` alias consistently: esbuild resolves it at build time,
 * `tsx` resolves it in dev from tsconfig, and Vitest resolves it from its own
 * alias config. No `.js` extension noise on every relative import, and no
 * loader hook in production.
 */
export default defineConfig({
  entry: ['src/server.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  sourcemap: true,
  clean: true,
  // Prisma ships platform-specific engine binaries and a WASM query compiler
  // that must be resolved from node_modules at runtime, not inlined.
  external: ['@prisma/client', '.prisma/client'],
  // A bundled ESM file has no `require`; pg and its peers still reach for it.
  banner: {
    js: [
      "import { createRequire as __createRequire } from 'node:module'",
      'const require = __createRequire(import.meta.url)',
    ].join('\n'),
  },
})
