import { cache } from 'react'

import { requireCouriersData, toRoleView } from '@/lib/couriers'
import { $876 } from '@/lib/876'

/**
 * The tenant's roles, deduplicated for the lifetime of one request.
 *
 * Two consumers need this list on the users page: the toolbar renders outside
 * the data boundary and needs it for the invite dialog, and the streamed member
 * table needs the full role views. The client call is uncached, so without this
 * wrapper the page issues the same tenant query twice — once blocking the
 * toolbar, once behind Suspense.
 */
export const listTeamRoles = cache(async (tenantId: string) =>
  requireCouriersData(await $876.couriers.roles.list(tenantId)).data.map(
    toRoleView
  )
)
