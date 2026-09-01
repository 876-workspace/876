import { AppHttpError } from '@/platform/errors'
import { nowUnixSeconds } from '@/platform/timestamps'

import * as repo from './tenants.repository'
import { serializeTenant } from './tenants.serializers'
import type {
  CreateTenantBody,
  Tenant,
  UpdateTenantBody,
} from './tenants.schemas'

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

export async function createTenant(input: CreateTenantBody): Promise<Tenant> {
  try {
    return serializeTenant(
      await repo.createTenant({
        orgId: input.org_id,
        slug: input.slug,
        name: input.name,
        creatorUserId: input.creator_user_id,
        now: nowUnixSeconds(),
      })
    )
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppHttpError({
        code: 'tenant/conflict',
        message: 'That organization or subdomain already has a tenant.',
        httpStatus: 409,
      })
    }
    throw error
  }
}

export async function updateTenant(
  id: string,
  input: UpdateTenantBody
): Promise<Tenant> {
  await retrieveTenant(id)
  if (input.mailbox_prefix === undefined) return retrieveTenant(id)
  return serializeTenant(
    await repo.updateTenantMailboxPrefix({
      id,
      mailboxPrefix: input.mailbox_prefix,
      now: nowUnixSeconds(),
    })
  )
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  )
}
