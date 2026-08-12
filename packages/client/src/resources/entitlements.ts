import type { create876Client as createPlatformClient } from '@876/sdk'

type Platform = ReturnType<typeof createPlatformClient>

export function createEntitlementsResource(platform: Platform) {
  const orgs = platform as unknown as { organizations: { subscriptions?: unknown } }
  return orgs.organizations.subscriptions
}
