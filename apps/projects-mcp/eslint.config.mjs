import rootConfig from '../../eslint.config.mjs'

export default [
  ...rootConfig,
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
  },
]
