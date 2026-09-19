import 'server-only'

import { create876AccountClient, type AccountClient } from '@876/account'

let accountClient: AccountClient | undefined

/**
 * Server-only Account client for self-scoped consumer account operations.
 * Initialization is lazy because OpenNext imports route modules before runtime
 * secrets are available.
 */
export function getAccount() {
  if (accountClient) return accountClient

  accountClient = create876AccountClient({
    apiKey: process.env.API_876_KEY,
  })

  return accountClient
}
