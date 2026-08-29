/**
 * Paths that are generated build output, not source.
 *
 * Every app produces at least some of these locally, and none of them are
 * committed. Without them a developer who has run a Vercel or PWA build sees
 * hundreds of lint errors from minified vendor code, which buries the real
 * findings in their own `src`. Kept in one list so a new app inherits it
 * instead of rediscovering each entry the first time a build runs.
 */
export const generatedIgnores = [
  '.next/**',
  '.open-next/**',
  '.wrangler/**',
  '.vercel/**',
  'coverage/**',
  'out/**',
  'build/**',
  'next-env.d.ts',
  'public/sw.js',
  'public/sw.js.map',
  'public/pwa/offline-recovery.js',
]
