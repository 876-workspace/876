import type {
  AdminProvisioningDraftReplaceParams,
  AdminProvisioningManifestRevision,
  AdminProvisioningSetup,
  AdminProvisioningSetupCreateParams,
  AdminProvisioningSetupUpdateParams,
  AdminProvisioningValidation,
} from '@876/platform/compat'

import { request } from './request'

const path = (setupKey: string) =>
  `/api/organizations/provisioning/setups/${encodeURIComponent(setupKey)}`

/**
 * Named day-zero configurations (Jamaica, United States, …). Each owns the
 * finance manifest that new organizations are provisioned from.
 */
export const provisioningSetups = {
  create(params: AdminProvisioningSetupCreateParams) {
    return request<AdminProvisioningSetup>(
      '/api/organizations/provisioning/setups',
      { method: 'POST', body: JSON.stringify(params) }
    )
  },

  update(setupKey: string, params: AdminProvisioningSetupUpdateParams) {
    return request<AdminProvisioningSetup>(path(setupKey), {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  },

  replaceDraft(setupKey: string, params: AdminProvisioningDraftReplaceParams) {
    return request<AdminProvisioningManifestRevision>(
      `${path(setupKey)}/draft`,
      {
        method: 'PUT',
        body: JSON.stringify(params),
      }
    )
  },

  validate(setupKey: string, params: AdminProvisioningDraftReplaceParams) {
    return request<AdminProvisioningValidation>(`${path(setupKey)}/validate`, {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  publish(setupKey: string) {
    return request<AdminProvisioningManifestRevision>(
      `${path(setupKey)}/publish`,
      { method: 'POST' }
    )
  },
}
