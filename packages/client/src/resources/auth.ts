import type { SDK876Client } from '@876/sdk'

export function createAuthResource(platform: SDK876Client) {
  return platform.auth
}
