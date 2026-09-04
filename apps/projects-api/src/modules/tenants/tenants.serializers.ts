import { fromDbUnixSeconds } from '../../platform/timestamps.js'
import type { TenantSerialized } from './tenants.schemas.js'

export type TenantRow = {
  id: string
  organizationId: string
  triageProjectId: string | null
  presetKey?: string
  createdAt: bigint | number
  updatedAt: bigint | number
}

export function serializeTenant(row: TenantRow): TenantSerialized {
  return {
    object: 'projects.tenant',
    id: row.id,
    organizationId: row.organizationId,
    triageProjectId: row.triageProjectId,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
