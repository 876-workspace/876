/**
 * Slugs an organization may never use, because `/[orgSlug]` sits at the root of
 * the couriers app.
 *
 * Next.js resolves static segments before dynamic ones, so `/login` keeps
 * working regardless. The hazard runs the other way: an organization whose slug
 * is `login` would have its workspace permanently shadowed, with no error
 * raised anywhere — the request simply renders the login page instead. Every
 * static root segment therefore has to be reserved, alongside the well-known
 * files served from the app root.
 *
 * `reserved-slugs.test.ts` reads `src/app/` at test time and fails if a new
 * root segment is missing here, so this list cannot quietly fall behind the
 * routes. Keep entries lowercase — `isReservedOrgSlug` lowercases its input.
 */
export const RESERVED_ORG_SLUGS: ReadonlySet<string> = new Set([
  // Static root route segments.
  'access-denied',
  'api',
  'app',
  'auth',
  'callback',
  'get-started',
  'login',
  'manage',
  'no-access',
  'onboarding',
  'portal',
  'register',
  // Framework and well-known root files.
  '_next',
  'favicon.ico',
  'manifest.json',
  'monitoring', // Sentry `tunnelRoute`
  'robots.txt',
  'sitemap.xml',
  'sw.js',
])

export function isReservedOrgSlug(slug: string): boolean {
  return RESERVED_ORG_SLUGS.has(slug.toLowerCase())
}
