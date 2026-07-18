import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Admin isolation: the consumer app must never import Console code.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@876/console-client*'],
              message:
                'Console-only logic is isolated to apps/console and must not be imported here.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    '.netlify/**',
    'coverage/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
