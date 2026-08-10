import type { OrganizationLocationReconciliation } from './organization-locations.schemas'

export function serializeReconciliation(options: {
  tenantId: string
  attempted: number
  succeeded: number
  failed: number
}): OrganizationLocationReconciliation {
  return {
    object: 'organization_location_reconciliation',
    tenant_id: options.tenantId,
    attempted: options.attempted,
    succeeded: options.succeeded,
    failed: options.failed,
  }
}
