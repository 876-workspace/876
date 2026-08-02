/**
 * Shared app-structure boundary rules for every Next.js app.
 *
 * Encodes the dependency direction from `.claude/rules/app-structure.md`:
 *
 *     app/  →  features/  →  components/  →  packages/ui
 *
 * Never the reverse. Import this fragment from each app's `eslint.config.mjs`.
 *
 * IMPORTANT — one config block per zone, not one per concern. ESLint
 * *replaces* a rule's options when a later matching config sets the same rule;
 * it does not merge them. Splitting these into "components may not import
 * features" and "nobody may import _components" blocks meant the second
 * silently erased the first for every file both matched, and the whole layer
 * was inert. Each zone below therefore lists every pattern that applies to it
 * in a single `no-restricted-imports`.
 *
 * What this file can and cannot check: import patterns are matched against the
 * *specifier*, with only the importing file's directory available for zoning.
 * That is enough for the layer rules below, but it cannot express "a route may
 * import an ancestor's `_components/` but not a sibling's", because that test
 * compares two paths. `scripts/check-app-structure.mjs` owns that one — the
 * two layers are complementary, keep both.
 */

const NO_FEATURES_FROM_COMPONENTS =
  'components/ may not import features/. A shell or pattern that knows a product domain is no longer app-wide. See .claude/rules/app-structure.md.'

const NO_ROUTE_CODE =
  'Dependencies point inward: app/ → features/ → components/. A module outside app/ may not import route code. See .claude/rules/app-structure.md.'

const NO_CROSS_FEATURE =
  'A feature may not import another feature via @/features/*. Use a relative import inside your own feature, or move the shared piece to components/patterns/ or src/lib/. See .claude/rules/app-structure.md.'

const NO_ROUTE_PRIVATE =
  'Route-private folders (_components/, _lib/) belong to their own route subtree. Shared UI belongs in features/<domain>/components/. See .claude/rules/app-structure.md.'

/** Patterns every non-route zone shares. */
const routePrivatePatterns = [
  {
    group: ['**/_components/*', '**/_components/**'],
    message: NO_ROUTE_PRIVATE,
  },
  { group: ['**/_lib/*', '**/_lib/**'], message: NO_ROUTE_PRIVATE },
]

const appPattern = { group: ['@/app/*', '@/app/**'], message: NO_ROUTE_CODE }

export const appStructureRules = [
  {
    name: 'app-structure/components',
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
            appPattern,
            ...routePrivatePatterns,
          ],
        },
      ],
    },
  },
  {
    name: 'app-structure/features',
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            // Inside your own feature, use a relative import. Reaching for the
            // @/features alias from within features/ is by definition a
            // cross-feature import.
            {
              group: ['@/features/*', '@/features/**'],
              message: NO_CROSS_FEATURE,
            },
            appPattern,
            ...routePrivatePatterns,
          ],
        },
      ],
    },
  },
  {
    name: 'app-structure/lib',
    files: ['src/lib/**/*.{ts,tsx}'],
    rules: {
      // The TS-aware variant, so `allowTypeImports` is available. A type-only
      // import is erased at compile time and creates no runtime dependency,
      // and some libraries require one: UploadThing types its client from the
      // router type declared in the route handler
      // (`import type { UploadRouter } from '@/app/api/uploadthing/core'`).
      // Banning that would force a contrived type duplication for no gain.
      'no-restricted-imports': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          patterns: [
            { ...appPattern, allowTypeImports: true },
            ...routePrivatePatterns,
            // Deliberately NOT banning @/features here. The written rule fixes
            // the direction app/ → features/ → components/ and says nothing
            // about lib/, and there is a legitimate case already in the tree:
            // console's lib/widgets-auth.ts reads features/widgets'
            // widget-catalog, which is domain *data*, not UI. Banning it would
            // bend working code to a constraint the rule never stated.
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
]

export default appStructureRules
