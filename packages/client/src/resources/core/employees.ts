import type { SDK876Client } from '@876/sdk'

export function createEmployeesResource(platform: SDK876Client) {
  return platform.employees
}
