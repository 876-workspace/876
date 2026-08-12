import type { create876Client as createPlatformClient } from '@876/sdk'

type Platform = ReturnType<typeof createPlatformClient>

export function createDepartmentsResource(platform: Platform) {
  return (platform as unknown as { departments: unknown }).departments
}
