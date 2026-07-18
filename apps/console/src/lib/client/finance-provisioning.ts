import type {
  AdminProvisioningDraftReplaceParams,
  AdminProvisioningManifestRevision,
  AdminProvisioningValidation,
} from '@876/admin'

import { request } from './request'

const path = '/api/organizations/provisioning/finance'

export const financeProvisioning = {
  replaceDraft(params: AdminProvisioningDraftReplaceParams) {
    return request<AdminProvisioningManifestRevision>(path, {
      method: 'PUT',
      body: JSON.stringify(params),
    })
  },
  validate(params: AdminProvisioningDraftReplaceParams) {
    return request<AdminProvisioningValidation>(`${path}/validate`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  publish() {
    return request<AdminProvisioningManifestRevision>(`${path}/publish`, {
      method: 'POST',
    })
  },
}
