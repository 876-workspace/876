import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { appStructureRules } from '../../eslint.app-structure.mjs'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...appStructureRules,
  globalIgnores([
    '.next/**',
    '.netlify/**',
    'coverage/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])
