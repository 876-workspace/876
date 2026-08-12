import type { create876Client as createPlatformClient } from '@876/sdk'

type Platform = ReturnType<typeof createPlatformClient>

export function createMembershipsResource(platform: Platform): any {
  return (platform as unknown as { memberships: unknown }).memberships
}
