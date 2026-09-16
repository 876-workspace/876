import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type IntegrationClientRow = {
  id: string
  tenantId: string
  organizationId: string
  name: string
  scopes: string[]
  secretHash: string
  keyPrefix: string
  lastUsedAt: bigint | number | null
  revokedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedIntegrationClient = {
  object: 'projects.integration-client'
  id: string
  tenantId: string
  organizationId: string
  name: string
  scopes: string[]
  keyPrefix: string
  lastUsedAt: number | null
  revokedAt: number | null
  createdAt: number
  updatedAt: number
}

export function serializeIntegrationClient(
  row: IntegrationClientRow
): SerializedIntegrationClient {
  return {
    object: 'projects.integration-client',
    id: row.id,
    tenantId: row.tenantId,
    organizationId: row.organizationId,
    name: row.name,
    scopes: row.scopes,
    keyPrefix: row.keyPrefix,
    lastUsedAt:
      row.lastUsedAt === null || row.lastUsedAt === undefined
        ? null
        : fromDbUnixSeconds(row.lastUsedAt),
    revokedAt:
      row.revokedAt === null || row.revokedAt === undefined
        ? null
        : fromDbUnixSeconds(row.revokedAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
