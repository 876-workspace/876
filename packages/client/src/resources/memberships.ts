import type { SDK876Client } from '@876/sdk'

export function createMembershipsResource(platform: SDK876Client) {
  return platform.memberships
}
