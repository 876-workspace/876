import type {
  ProvisioningSetupPolicy,
  ProvisioningSetupPolicyReplaceParams,
} from '@876/core/types/provisioning-policy'
import type {
  AdminDeletedProvisioningSetup,
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

export type ConsoleProvisioningSetupCreateParams =
  AdminProvisioningSetupCreateParams & {
    policy?: ProvisioningSetupPolicyReplaceParams
  }

/**
 * Named day-zero configurations. Finance remains manifest v1; matching and
 * access policy are edited independently at `/policy`.
 */
export const provisioningSetups = {
  create(params: ConsoleProvisioningSetupCreateParams) {
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

  retrievePolicy(setupKey: string) {
    return request<ProvisioningSetupPolicy>(`${path(setupKey)}/policy`)
  },

  replacePolicy(
    setupKey: string,
    params: ProvisioningSetupPolicyReplaceParams
  ) {
    return request<ProvisioningSetupPolicy>(`${path(setupKey)}/policy`, {
      method: 'PUT',
      body: JSON.stringify(params),
    })
  },

  del(setupKey: string) {
    return request<AdminDeletedProvisioningSetup>(path(setupKey), {
      method: 'DELETE',
    })
  },

  purge(setupKey: string) {
    return request<AdminDeletedProvisioningSetup>(`${path(setupKey)}/purge`, {
      method: 'DELETE',
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
