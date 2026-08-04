import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'apps/*/.next/**',
    'apps/*/.open-next/**',
    'apps/*/.wrangler/**',
    'apps/*/public/sw.js',
    'apps/*/public/sw.js.map',
    'packages/*/dist/**',
    'packages/*/node_modules/**',
    'coverage/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
