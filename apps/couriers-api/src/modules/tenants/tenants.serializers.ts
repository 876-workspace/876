import type { Tenant } from './tenants.schemas'
import { fromDbUnixSeconds } from '@/platform/timestamps'

export type TenantRow = {
  id: string
  orgId: string
  slug: string
  name: string
  mailboxPrefix: string | null
  status: string
  createdAt: number | bigint
  updatedAt: number | bigint
}

export function serializeTenant(row: TenantRow): Tenant {
  return {
    object: 'tenant',
    id: row.id,
    org_id: row.orgId,
    slug: row.slug,
    name: row.name,
    mailbox_prefix: row.mailboxPrefix,
    status: row.status,
    created_at: fromDbUnixSeconds(row.createdAt),
    updated_at: fromDbUnixSeconds(row.updatedAt),
  }
}
