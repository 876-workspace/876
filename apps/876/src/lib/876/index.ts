import 'server-only'

import { create876ServerClient } from '@876/client/server'

/**
 * Server-only 876 SDK client (`$876`) for first-party, API-key-tier calls.
 * Reaches only non-`AdminDep`, self-scoped endpoints (the user's own developer
 * apps and connected apps); privileged reads stay on `@/lib/auth/admin-client`.
 */
export const $876 = create876ServerClient({
  app: '876',
  apiKey: process.env.API_876_KEY,
})
