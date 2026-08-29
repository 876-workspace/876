import { getError } from '@876/core'

import * as tenants from '../tenants/tenants.service.js'
import * as repository from './requests.repository.js'

/** Resolves one active tenant/request pair for request-scoped child modules. */
export async function requireRequestContext(
  organizationId: string,
  requestId: string
) {
  const tenant = await tenants.retrieveByOrganization(organizationId)
  if (!tenant) return getError('crm/tenant-not-found')
  if (tenant.status !== 'ACTIVE') return getError('crm/tenant-inactive')

  const request = await repository.retrieve(tenant.id, requestId)
  if (!request) return getError('crm/request-not-found')

  return { tenantId: tenant.id, requestId: request.id }
}
