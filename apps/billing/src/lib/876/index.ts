import 'server-only'

import { create876Client } from '@876/sdk'

/**
 * Server-only 876 SDK client (`$876`) for first-party, API-key-tier calls.
 * Reaches only non-`AdminDep` endpoints; routing and entitlement bootstrap
 * use the narrow client in `@/lib/876/platform-client`.
 */
export const $876 = create876Client({
  apiKey: process.env.BILLING_API_876_KEY,
})
