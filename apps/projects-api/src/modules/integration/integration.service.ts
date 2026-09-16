import { randomBytes } from 'node:crypto'

import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { getLogger } from '../../platform/logger.js'
import {
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as tenants from '../tenants/index.js'
import * as repository from './integration.repository.js'
import {
  hashIntegrationSecret,
} from './integration.guard.js'
import type { CreateIntegrationClientBody } from './integration.schemas.js'
import {
  serializeIntegrationClient,
  type SerializedIntegrationClient,
} from './integration.serializers.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

const log = getLogger('integration')

export type CreatedIntegrationClient = {
  client: SerializedIntegrationClient
  secret: string
}

export async function createClient(
  body: CreateIntegrationClientBody
): Promise<ServiceResult<CreatedIntegrationClient>> {
  const tenant = await tenants.resolveTenant(body.organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const secret = randomBytes(32).toString('hex')
  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  const row = await repository.createClient({
    id: generateId('integrationClient'),
    tenantId: tenant.id,
    organizationId: body.organizationId,
    name: body.name,
    scopes: [...body.scopes],
    secretHash: hashIntegrationSecret(secret),
    keyPrefix: secret.slice(0, 8),
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  log.info(
    { client_id: row.id, tenant_id: row.tenantId, scopes: row.scopes },
    'integration.client_created'
  )
  return {
    data: { client: serializeIntegrationClient(row), secret },
    error: null,
  }
}

export async function listClients(
  organizationId: string
): Promise<ServiceResult<SerializedIntegrationClient[]>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const rows = await repository.listClients(tenant.id)
  return { data: rows.map(serializeIntegrationClient), error: null }
}

export async function revokeClient(
  organizationId: string,
  clientId: string
): Promise<ServiceResult<SerializedIntegrationClient>> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { data: null, error: getError('projects/tenant-not-found') }
  const existing = await repository.retrieveClient(clientId)
  if (!existing || existing.tenantId !== tenant.id)
    return {
      data: null,
      error: getError('projects/integration-client-not-found'),
    }
  if (existing.revokedAt !== null)
    return { data: serializeIntegrationClient(existing), error: null }
  const row = await repository.revokeClient(
    existing.id,
    toDbUnixSeconds(nowUnixSeconds())
  )
  log.info({ client_id: row.id }, 'integration.client_revoked')
  return { data: serializeIntegrationClient(row), error: null }
}
