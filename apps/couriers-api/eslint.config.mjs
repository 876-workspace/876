import parser from '@typescript-eslint/parser'

export default [
  { ignores: ['dist', 'node_modules', 'src/db/generated'] },
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
  },
]
