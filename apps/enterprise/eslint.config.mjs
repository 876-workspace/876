import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { appStructureRules } from '../../eslint.app-structure.mjs'
import { generatedIgnores } from '../../eslint.ignores.mjs'
import { typesafetyRules } from '../../eslint.typesafety.mjs'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...appStructureRules,
  ...typesafetyRules,
  globalIgnores(generatedIgnores),
])

export default eslintConfig
