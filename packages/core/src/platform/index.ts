/**
 * `@876/core/platform` — the narrow, server-only platform bootstrap client
 * for first-party product apps (Couriers, Billing, Enterprise, the consumer
 * app, future apps).
 *
 * Product apps need a handful of privileged platform reads and provisioning
 * calls — session routing memberships, feature evaluation, app-subscription
 * entitlements, sensitive-identifier disclosure — whose backing endpoints are
 * internal-key tier. The full `@876/admin` package is the Console-only
 * surface and must never be a dependency of a product app; this module
 * carries ONLY the bootstrap subset so the admin surface (platform-wide
 * user/org CRUD, search, moderation) literally does not exist in product-app
 * bundles.
 *
 * The `server-only` guard plus the `x-internal-key` credential make this
 * strictly server-side. Apps wrap it in a small `src/lib/auth/` module that
 * supplies their own app API key and per-request id; nothing here may be
 * imported from browser code.
 *
 * This module is pure composition — runtime/transport live in `./runtime.ts`
 * and `./request.ts`, types live in `./types.ts`, and each namespace
 * (`provisioning`, `auth`, `geo`, `features`, `memberships`, `onboarding`,
 * `orgs`, `users`) is its own factory module under `./resources/`, mirroring
 * `@876/admin`'s `src/resources/*.ts` layering.
 *
 * @module @876/core/platform
 */
import 'server-only'

import { buildPlatformRuntime } from './runtime'
import { createPlatformAuthResource } from './resources/auth'
import { createPlatformFeaturesResource } from './resources/features'
import { createPlatformGeoResource } from './resources/geo'
import { createPlatformMembershipsResource } from './resources/memberships'
import { createPlatformOnboardingResource } from './resources/onboarding'
import { createPlatformOrgsResource } from './resources/orgs'
import { createPlatformProvisioningResource } from './resources/provisioning'
import { createPlatformUsersResource } from './resources/users'
import type { Platform876ClientOptions } from './types'

export * from './types'

/**
 * Creates the server-only platform bootstrap client.
 *
 * @example
 * const platform = create876PlatformClient({ apiKey: process.env.API_876_KEY })
 * const memberships = await platform.auth.getRoutingMemberships({ userId })
 */
export function create876PlatformClient(
  options: Platform876ClientOptions = {}
) {
  const runtime = buildPlatformRuntime(options)

  return {
    provisioning: createPlatformProvisioningResource(runtime),
    auth: createPlatformAuthResource(runtime),
    geo: createPlatformGeoResource(runtime),
    features: createPlatformFeaturesResource(runtime),
    memberships: createPlatformMembershipsResource(runtime),
    onboarding: createPlatformOnboardingResource(runtime),
    orgs: createPlatformOrgsResource(runtime),
    users: createPlatformUsersResource(runtime),
  }
}

/** The narrow platform client returned by {@link create876PlatformClient}. */
export type Platform876Client = ReturnType<typeof create876PlatformClient>
