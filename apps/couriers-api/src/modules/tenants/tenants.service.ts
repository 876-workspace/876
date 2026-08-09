import { AppHttpError } from '@/platform/errors'

import * as repo from './tenants.repository'
import { serializeTenant } from './tenants.serializers'
import type { Tenant } from './tenants.schemas'

export async function retrieveTenant(id: string): Promise<Tenant> {
  const row = await repo.findTenantById(id)
  if (!row)
    throw new AppHttpError({
      code: 'tenant/not-found',
      message: 'Not found.',
      httpStatus: 404,
    })
  return serializeTenant(row)
}

export async function retrieveTenantByOrgId(orgId: string): Promise<Tenant> {
  const row = await repo.findTenantByOrgId(orgId)
  if (!row)
    throw new AppHttpError({
      code: 'tenant/not-found',
      message: 'Not found.',
      httpStatus: 404,
    })
  return serializeTenant(row)
}

export async function listTenants(query: {
  limit: number
  starting_after?: string
  ending_before?: string
}): Promise<{ tenants: Tenant[]; hasMore: boolean; totalCount: number }> {
  const [rows, totalCount] = await Promise.all([
    repo.listTenants({
      limit: query.limit,
      startingAfter: query.starting_after,
      endingBefore: query.ending_before,
    }),
    repo.countTenants(),
  ])
  const hasMore = rows.length > query.limit
  const page = rows.slice(0, query.limit)
  return {
    tenants: (query.ending_before ? page.reverse() : page).map(serializeTenant),
    hasMore,
    totalCount,
  }
}
