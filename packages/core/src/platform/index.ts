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
 * and `./request.ts`, types live in `./types.ts`, and internal resource
 * factories live under `./resources/`. The public surface is flattened to
 * `$876.resource.verb()`; only genuine subsystems retain deeper nesting.
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
 * const $876 = create876PlatformClient({ apiKey: process.env.API_876_KEY })
 * const memberships = await $876.memberships.listRouting({ userId })
 */
export function create876PlatformClient(
  options: Platform876ClientOptions = {}
) {
  const runtime = buildPlatformRuntime(options)
  const { getRoutingMemberships } = createPlatformAuthResource(runtime)
  const { listCountries, listRegions } = createPlatformGeoResource(runtime)
  const memberships = createPlatformMembershipsResource(runtime)
  const { identifications, ...users } = createPlatformUsersResource(runtime)
  const { invites, locations, subscriptions, ...organizations } =
    createPlatformOrgsResource(runtime)

  return {
    provisioning: createPlatformProvisioningResource(runtime),
    features: createPlatformFeaturesResource(runtime),
    memberships: {
      ...memberships,
      listRouting: getRoutingMemberships,
    },
    onboarding: createPlatformOnboardingResource(runtime),
    organizations,
    invites,
    locations,
    subscriptions,
    countries: { list: listCountries },
    regions: { list: listRegions },
    users,
    identifications,
  }
}

/** The narrow platform client returned by {@link create876PlatformClient}. */
export type Platform876Client = ReturnType<typeof create876PlatformClient>
