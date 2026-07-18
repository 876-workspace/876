import 'server-only'

import { create876AdminClient } from '@876/admin'

/**
 * The 876 platform client for Console — privileged admin tier
 * (`x-internal-key`), server-only. Call the standardized surface directly:
 * `$876.users.list()`, `$876.orgs.retrieveBySlug(slug)`, …
 *
 * Console-internal data (team, roles, notes) lives in Console's own
 * database and is reached through `service` (`@/lib/service`), not `$876`.
 */
export const $876 = create876AdminClient({
  internalKey: process.env.API_INTERNAL_KEY,
  apiKey: process.env.API_876_KEY,
})
