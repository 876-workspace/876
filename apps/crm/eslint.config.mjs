import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import { generatedIgnores } from '../../eslint.ignores.mjs'
import { typesafetyRules } from '../../eslint.typesafety.mjs'

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypeScript,
  ...typesafetyRules,
  globalIgnores(generatedIgnores),
])
