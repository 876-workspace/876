import 'server-only'

import { create876ServerClient } from '@876/client/server'

/**
 * Server-only 876 SDK client (`$876`) for first-party, API-key-tier calls.
 * Reaches only non-`AdminDep` endpoints; routing and entitlement bootstrap
 * use the narrow client in `@/lib/876/platform-client`.
 */
export const $876 = create876ServerClient({
  apiKey: process.env.BILLING_API_876_KEY,
  widgets: {
    baseUrl: process.env.WIDGETS_API_URL,
    serviceKey: process.env.WIDGETS_SERVICE_KEY,
    host: 'billing',
  },
})
