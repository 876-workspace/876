export const PLATFORM_REQUESTS_HREF = '/requests' as const

/**
 * Return the collection route that owns a request record.
 *
 * The same request components render in Console's platform request surface and
 * organization-scoped CRM surfaces. Deriving the collection from the supplied
 * record href keeps shared UI free of a hard-coded host route.
 */
export function requestCollectionHref(
  baseHref: string,
  requestId: string
): string {
  const suffix = `/${requestId}`
  return baseHref.endsWith(suffix)
    ? baseHref.slice(0, -suffix.length) || PLATFORM_REQUESTS_HREF
    : PLATFORM_REQUESTS_HREF
}
