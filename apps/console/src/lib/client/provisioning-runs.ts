import type {
  AdminProvisioningReconciliationResult,
  AdminProvisioningRun,
} from '@876/admin'

import { request } from './request'

export const provisioningRuns = {
  retry(runId: string) {
    return request<AdminProvisioningRun>(
      `/api/provisioning/runs/${encodeURIComponent(runId)}/retry`,
      { method: 'POST' }
    )
  },

  reconcile(params: { app_id?: string; organization_id?: string } = {}) {
    return request<AdminProvisioningReconciliationResult>(
      '/api/provisioning/runs/reconcile',
      { method: 'POST', body: JSON.stringify(params) }
    )
  },
}
