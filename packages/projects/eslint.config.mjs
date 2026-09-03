import rootConfig from '../../eslint.config.mjs'

const eslintConfig = [
  ...rootConfig,
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
]

export default eslintConfig
