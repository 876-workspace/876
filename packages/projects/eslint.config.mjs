import rootConfig from '../../eslint.config.mjs'
import { typesafetyRules } from '../../eslint.typesafety.mjs'

const eslintConfig = [
  ...rootConfig,
  ...typesafetyRules,
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
]

export default eslintConfig
