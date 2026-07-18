import 'server-only'

import { create876AdminClient } from '@876/admin'
import { headers } from 'next/headers'

/**
 * Server-only factory for the privileged 876 admin client.
 *
 * The API's global guard (`require_api_key`) requires a valid app key on every
 * protected request; `AdminDep` then additionally verifies the internal key.
 * Both are sent here, matching Console's admin client — sending only the
 * internal key is rejected at the api-key gate.
 *
 * `API_876_KEY` and `API_INTERNAL_KEY` are server-only and never reach the
 * browser.
 */
export async function getAdminClient() {
  const requestId = (await headers()).get('x-request-id') ?? undefined

  return create876AdminClient({
    internalKey: process.env.API_INTERNAL_KEY,
    apiKey: process.env.API_876_KEY,
    requestId,
  })
}
