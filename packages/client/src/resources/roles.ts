import type { SDK876Client } from '@876/sdk'

/**
 * Canonical `$876.roles` — Core org roles. Couriers tenant roles surface
 * through the same canonical name when the Couriers admin tier is composed
 * (`app: 'couriers'`), never as a `couriersRoles` namespace.
 */
export function createRolesResource(platform: SDK876Client) {
  return platform.roles
}
