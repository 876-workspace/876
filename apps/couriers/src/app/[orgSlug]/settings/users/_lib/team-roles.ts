import { cache } from 'react'

import { service } from '@/lib/service'

/**
 * The tenant's roles, deduplicated for the lifetime of one request.
 *
 * Two consumers need this list on the users page: the toolbar renders outside
 * the data boundary and needs it for the invite dialog, and the streamed member
 * table needs the full role views. `service.roles.list` is an uncached Prisma
 * `findMany`, so without this wrapper the page issues the same tenant query
 * twice — once blocking the toolbar, once behind Suspense.
 */
export const listTeamRoles = cache((tenantId: string) =>
  service.roles.list(tenantId)
)
