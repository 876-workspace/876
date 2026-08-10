import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  organizationLocationReconciliationSchema,
  type OrganizationLocationReconciliation,
  type SyncOrganizationLocationBody,
} from '../types/organization-location.schema'

export function createOrganizationLocationsResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/organization-locations`

  return {
    /** Repairs a bounded batch of unlinked branch and warehouse mirrors. */
    reconcile(tenantId: string) {
      return AdminRequest<OrganizationLocationReconciliation>(
        runtime,
        { method: 'POST', path: `${path(tenantId)}/reconcile` },
        organizationLocationReconciliationSchema
      )
    },

    /** Synchronizes the core organization location for one changed site. */
    sync(tenantId: string, body: SyncOrganizationLocationBody) {
      return AdminRequest<OrganizationLocationReconciliation>(
        runtime,
        { method: 'POST', path: `${path(tenantId)}/sync`, body },
        organizationLocationReconciliationSchema
      )
    },
  }
}
