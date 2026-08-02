/**
 * Shared app-structure boundary rules for every Next.js app.
 *
 * Encodes the dependency direction from `.claude/rules/app-structure.md`:
 *
 *     app/  →  features/  →  components/  →  packages/ui
 *
 * Never the reverse. Import this fragment from each app's `eslint.config.mjs`.
 *
 * What this file can and cannot check: ESLint import patterns are matched
 * against the *specifier*, with only the importing file's directory available
 * for zoning. That is enough for the layer rules below, but it cannot express
 * "a route may import an ancestor's `_components/` but not a sibling's",
 * because that test compares two paths. `scripts/check-app-structure.mjs`
 * owns that one — keep both.
 */

const NO_FEATURES_FROM_COMPONENTS =
  'components/ may not import features/. A shell or pattern that knows a product domain is no longer app-wide. See .claude/rules/app-structure.md.'

const NO_APP_FROM_LIB_LAYERS =
  'Dependencies point inward: app/ → features/ → components/. A module outside app/ may not import route code. See .claude/rules/app-structure.md.'

const NO_CROSS_FEATURE =
  'A feature may not import another feature via @/features/*. Use a relative import inside your own feature, or move the shared piece to components/patterns/ or src/lib/. See .claude/rules/app-structure.md.'

const NO_ROUTE_PRIVATE =
  'Route-private folders (_components/, _lib/) belong to their own route subtree. Shared UI belongs in features/<domain>/components/. See .claude/rules/app-structure.md.'

export const appStructureRules = [
  {
    name: 'app-structure/components-are-domain-agnostic',
    files: ['src/components/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '@/features/**'],
              message: NO_FEATURES_FROM_COMPONENTS,
            },
            { group: ['@/app/*', '@/app/**'], message: NO_APP_FROM_LIB_LAYERS },
          ],
        },
      ],
    },
  },
  {
    name: 'app-structure/features-are-independent',
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            // Within your own feature, use a relative import. Reaching for the
            // @/features alias from inside features/ is by definition a
            // cross-feature import.
            {
              group: ['@/features/*', '@/features/**'],
              message: NO_CROSS_FEATURE,
            },
            { group: ['@/app/*', '@/app/**'], message: NO_APP_FROM_LIB_LAYERS },
          ],
        },
      ],
    },
  },
  {
    name: 'app-structure/lib-is-not-ui',
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            { group: ['@/app/*', '@/app/**'], message: NO_APP_FROM_LIB_LAYERS },
            // Deliberately NOT banning @/features here. The written rule fixes
            // the direction app/ → features/ → components/ and says nothing
            // about lib/, and there is a legitimate case already in the tree:
            // console's lib/widgets-auth.ts reads features/widgets'
            // widget-catalog, which is domain *data*, not UI. Banning it would
            // bend working code to a constraint the rule never stated.
            // What lib/ must not do is render — that is check 5 below.
          ],
        },
      ],
    },
  },
  {
    name: 'app-structure/lib-holds-no-jsx',
    files: ['src/lib/**/*.tsx'],
    rules: {
      // A .tsx under lib/ is a component that landed in the wrong bucket.
      // Scoped to files that actually declare JSX-bearing React components.
      'no-restricted-syntax': [
        'warn',
        {
          selector: 'JSXElement',
          message:
            'src/lib/ holds no JSX — a rendering module belongs in components/ or features/. See .claude/rules/app-structure.md.',
        },
      ],
    },
  },
  {
    name: 'app-structure/route-private-folders-stay-private',
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/features/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/_components/*', '**/_components/**'],
              message: NO_ROUTE_PRIVATE,
            },
            { group: ['**/_lib/*', '**/_lib/**'], message: NO_ROUTE_PRIVATE },
          ],
        },
      ],
    },
  },
]

export default appStructureRules
