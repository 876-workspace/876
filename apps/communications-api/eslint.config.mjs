import rootConfig from '../../eslint.config.mjs'
import { typesafetyRules } from '../../eslint.typesafety.mjs'

export default [
  ...rootConfig,
  ...typesafetyRules,
  {
    ignores: ['dist/**', 'src/db/generated/**', 'scripts/**'],
  },
]
