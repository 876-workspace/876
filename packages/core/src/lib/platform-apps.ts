/** Canonical slugs used by first-party 876 applications at runtime. */
export const PLATFORM_APP_SLUGS = {
  consumer: '876-consumer',
  enterprise: '876-enterprise',
  console: 'console',
  couriers: '876-couriers',
  billing: '876-billing',
} as const

export type PlatformAppName = keyof typeof PLATFORM_APP_SLUGS
export type PlatformAppSlug = (typeof PLATFORM_APP_SLUGS)[PlatformAppName]

const PLATFORM_FEATURE_PREFIXES: Record<PlatformAppSlug, string> = {
  [PLATFORM_APP_SLUGS.consumer]: 'app',
  [PLATFORM_APP_SLUGS.enterprise]: 'enterprise',
  [PLATFORM_APP_SLUGS.console]: 'console',
  [PLATFORM_APP_SLUGS.couriers]: 'couriers',
  [PLATFORM_APP_SLUGS.billing]: 'billing',
}

/**
 * Resolves the required feature-key prefix for an application slug.
 *
 * First-party exceptions are explicit. Newly registered apps derive a stable
 * snake-case prefix from their persisted slug so Console can scope flags
 * before a dedicated registry entry is needed.
 */
export function featurePrefixForAppSlug(appSlug: string): string {
  if (appSlug in PLATFORM_FEATURE_PREFIXES)
    return PLATFORM_FEATURE_PREFIXES[appSlug as PlatformAppSlug]

  return appSlug
    .replace(/^876-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Returns the prefix, including its separator, for app-owned feature keys. */
export function featureKeyPrefixForAppSlug(appSlug: string): string {
  const prefix = featurePrefixForAppSlug(appSlug)

  return prefix ? `${prefix}_` : ''
}
