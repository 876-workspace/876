import type { create876Client as createPlatformClient } from '@876/sdk'

type Platform = ReturnType<typeof createPlatformClient>

export function createEmployeesResource(platform: Platform) {
  return (platform as unknown as { employees: unknown }).employees
}
