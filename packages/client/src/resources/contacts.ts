import type { SDK876Client } from '@876/sdk'

export function createContactsResource(platform: SDK876Client) {
  return platform.contacts
}
