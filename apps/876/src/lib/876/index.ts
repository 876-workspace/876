import 'server-only'

import { create876Client } from '@876/sdk'

/**
 * Server-only 876 SDK client (`$876`) for first-party, API-key-tier calls.
 * Reaches only non-`AdminDep`, self-scoped endpoints (the user's own developer
 * apps and connected apps); privileged reads stay on `@/lib/auth/admin-client`.
 */
export const $876 = create876Client({
  apiKey: process.env.API_876_KEY,
})
