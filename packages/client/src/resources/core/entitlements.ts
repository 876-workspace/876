import type { SDK876Client } from '@876/sdk'

/**
 * Org/user access to 876 apps and features. The Core SDK exposes this as
 * `platform.subscriptions` (org → app access); the facade renames it
 * `$876.entitlements` to keep it distinct from commercial Billing
 * subscriptions (`$876.subscriptions`).
 */
export function createEntitlementsResource(platform: SDK876Client) {
  return platform.subscriptions
}
