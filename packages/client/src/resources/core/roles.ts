import type { SDK876Client } from '@876/sdk'
import type { CouriersAdminClient } from '@876/couriers/admin'

/**
 * Canonical `$876.roles` — resolves to Couriers tenant roles when the Couriers
 * admin tier is composed (`app: 'couriers'`), or Core org-structure roles
 * otherwise. Both share the same canonical `$876.roles.*` call sites; the
 * difference in backing transport is internal.
 */
export function createRolesResource(
  platform: SDK876Client,
  couriersAdmin: CouriersAdminClient
): CouriersAdminClient['roles']
export function createRolesResource(
  platform: SDK876Client,
  couriersAdmin?: undefined
): SDK876Client['roles']
export function createRolesResource(
  platform: SDK876Client,
  couriersAdmin?: CouriersAdminClient
): CouriersAdminClient['roles'] | SDK876Client['roles'] {
  if (couriersAdmin) return couriersAdmin.roles
  return platform.roles
}
