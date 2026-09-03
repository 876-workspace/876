import rootConfig from '../../eslint.config.mjs'

export default [
  ...rootConfig,
  {
    ignores: ['dist/**', 'src/db/generated/**', 'scripts/**'],
  },
]
