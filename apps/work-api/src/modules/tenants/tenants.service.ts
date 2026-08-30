import type { WorkTenant } from '@876/work'

import * as repository from './tenants.repository.js'

function serialize(
  tenant: NonNullable<Awaited<ReturnType<typeof repository.retrieveByOrganization>>>
): WorkTenant {
  return {
    object: 'work_tenant',
    id: tenant.id,
    organizationId: tenant.organizationId,
    status: tenant.status,
    createdAt: Math.floor(tenant.createdAt.getTime() / 1000),
    updatedAt: Math.floor(tenant.updatedAt.getTime() / 1000),
  }
}

export async function retrieveByOrganization(organizationId: string) {
  const tenant = await repository.retrieveByOrganization(organizationId)
  return tenant ? serialize(tenant) : null
}

export async function ensure(organizationId: string) {
  return serialize(await repository.ensure(organizationId))
}
