import type { SDK876Client } from '@876/sdk'
import type { CouriersAdminClient } from '@876/couriers/admin'

/**
 * Canonical `$876.memberships` — resolves to Couriers tenant team members when
 * the Couriers admin tier is composed (`app: 'couriers'`), or Core org
 * memberships otherwise. Couriers team operations (update role, remove member)
 * use the Couriers admin transport; Core membership queries use the SDK.
 */
export function createMembershipsResource(
  platform: SDK876Client,
  couriersAdmin: CouriersAdminClient
): CouriersAdminClient['team']
export function createMembershipsResource(
  platform: SDK876Client,
  couriersAdmin?: undefined
): SDK876Client['memberships']
export function createMembershipsResource(
  platform: SDK876Client,
  couriersAdmin?: CouriersAdminClient
): CouriersAdminClient['team'] | SDK876Client['memberships'] {
  if (couriersAdmin) return couriersAdmin.team
  return platform.memberships
}
