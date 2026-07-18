import 'server-only'

import { roles } from './roles'
import { team } from './team'
import { users } from './users'

/**
 * Console's server-side data layer — the only code that talks to Console's
 * own database, plus `$876` orchestration where a mutation spans both.
 *
 * Usage: `service.<resource>.<verb>()`, e.g. `service.team.list()`,
 * `service.roles.create(params)`. Reads return plain values; mutations
 * return `{ data, error }` envelopes (`ServiceResult`).
 */
export const service = {
  team,
  roles,
  users,
}
