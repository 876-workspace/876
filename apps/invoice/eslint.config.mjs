import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { appStructureRules } from '../../eslint.app-structure.mjs'
import { generatedIgnores } from '../../eslint.ignores.mjs'

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...appStructureRules,
  globalIgnores(generatedIgnores),
])
