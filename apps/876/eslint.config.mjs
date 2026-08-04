import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { createAppStructureRules } from '../../eslint.app-structure.mjs'

/** Admin isolation: the consumer app must never import Console code. */
const consoleIsolation = {
  group: ['@876/console-client*'],
  message:
    'Console-only logic is isolated to apps/console and must not be imported here.',
}

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Applies everywhere. The structural zones below re-declare
  // no-restricted-imports for src/{components,features,lib}, and flat config
  // *replaces* rule options rather than merging them — so this pattern is also
  // merged into those zones via createAppStructureRules, otherwise one or the
  // other would be silently lost for every file both match.
  {
    rules: {
      'no-restricted-imports': ['error', { patterns: [consoleIsolation] }],
    },
  },
  ...createAppStructureRules({ extraPatterns: [consoleIsolation] }),
  globalIgnores([
    '.next/**',
    'coverage/**',
    'out/**',
    'build/**',
    'public/sw.js',
    'public/sw.js.map',
    'next-env.d.ts',
  ]),
])

export default eslintConfig
