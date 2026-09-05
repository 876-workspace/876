/**
 * Workspace packages that ship React/TypeScript **source** rather than built
 * output, and therefore must be listed in every Next app's
 * `transpilePackages`.
 *
 * This list is the platform's UI sync point. A shared surface added here is
 * picked up by every existing app and by every future one (careers, events,
 * …) without editing that app's `next.config.ts` — which is what stops one
 * app from silently rendering a stale or missing surface.
 *
 * Forgetting an entry does not fail the build. It fails at runtime, in the
 * browser, as `Element type is invalid. Received a promise that resolves to:
 * undefined` at the first client component the package exports — which is how
 * `@876/crm-ui` and `@876/work-ui` broke Console's CRM workspace on
 * 2026-08-30. `pnpm check:transpile` exists so that cannot recur.
 */
export const SHARED_UI_PACKAGES = [
  '@876/ui',
  '@876/work-ui',
  '@876/crm-ui',
  '@876/access-ui',
  '@876/billing-ui',
  '@876/projects-ui',
]

/**
 * Build a Next `transpilePackages` list: every shared UI package, plus the
 * app-specific packages the caller passes.
 */
export function sharedTranspilePackages(extra = []) {
  return [...new Set([...SHARED_UI_PACKAGES, ...extra])]
}

/**
 * Shared product-UI packages whose component source trees must be scanned
 * by Tailwind via `@source` in host apps that transpile them.
 *
 * `@876/ui` is excluded because its design tokens and UI primitives
 * are imported directly via `@import '@876/ui/styles.css'`.
 */
export const SHARED_PRODUCT_UI_PACKAGES = SHARED_UI_PACKAGES.filter(
  (pkg) => pkg !== '@876/ui'
)

/**
 * Expected Tailwind v4 `@source` glob for a package from within an app's
 * `apps/<app>/src/app/globals.css`.
 */
export function tailwindSourceGlobForPackage(packageName) {
  const shortName = packageName.replace(/^@876\//, '')
  return `../../../../packages/${shortName}/src/**/*.{ts,tsx}`
}
