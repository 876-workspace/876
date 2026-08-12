import type { create876Client as createPlatformClient } from '@876/sdk'

type Platform = ReturnType<typeof createPlatformClient>

export function createRolesResource(platform: Platform) {
  return (platform as unknown as { roles: unknown }).roles
}
