import type { SDK876Client } from '@876/sdk'

export function createDepartmentsResource(platform: SDK876Client) {
  return platform.departments
}
