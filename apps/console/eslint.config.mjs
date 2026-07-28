import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    '.netlify/**',
    '.open-next/**',
    '.wrangler/**',
    'coverage/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/sw.js',
    'public/sw.js.map',
  ]),
])

export default eslintConfig
