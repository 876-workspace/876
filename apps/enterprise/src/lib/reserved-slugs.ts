/**
 * Slugs an organization may never use because `/[slug]` sits at the Enterprise
 * app root. Static routes and browser asset requests must not enter the
 * authenticated workspace layout.
 */
export const RESERVED_ORG_SLUGS: ReadonlySet<string> = new Set([
  'access-denied',
  'api',
  'auth',
  'callback',
  'login',
  'no-access',
  'onboarding',
  'register',
  '_next',
  'favicon.ico',
  'manifest.json',
  'monitoring',
  'robots.txt',
  'sitemap.xml',
  'sw.js',
])

export function isReservedOrgSlug(slug: string): boolean {
  const normalized = slug.toLowerCase()
  return RESERVED_ORG_SLUGS.has(normalized) || normalized.includes('.')
}
