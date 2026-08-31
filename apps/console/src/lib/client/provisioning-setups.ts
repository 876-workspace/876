import type {
  ProvisioningSetupPolicy,
  ProvisioningSetupPolicyReplaceParams,
} from '@876/core/types/provisioning-policy'
import type {
  AdminDeletedProvisioningSetup,
  AdminListResponse,
  AdminProvisioningDraftReplaceParams,
  AdminProvisioningManifestRevision,
  AdminProvisioningSetup,
  AdminProvisioningSetupCreateParams,
  AdminProvisioningSetupUpdateParams,
  AdminProvisioningValidation,
} from '@876/platform/compat'

import type {
  DeletedProvisioningSetupResource,
  ProvisioningSetupResource,
  ProvisioningSetupResourceCreateParams,
  ProvisioningSetupResourceType,
  ProvisioningSetupResourceUpdateParams,
} from '@/types/provisioning'

import { request } from './request'

const path = (setupKey: string) =>
  `/api/organizations/provisioning/setups/${encodeURIComponent(setupKey)}`

const resourcePath = (setupKey: string, resourceType: string) =>
  `${path(setupKey)}/resources/${encodeURIComponent(resourceType)}`

function resourceClient(resourceType: ProvisioningSetupResourceType) {
  return {
    list(setupKey: string) {
      return request<AdminListResponse<ProvisioningSetupResource>>(
        resourcePath(setupKey, resourceType)
      )
    },

    create(setupKey: string, params: ProvisioningSetupResourceCreateParams) {
      return request<ProvisioningSetupResource>(
        resourcePath(setupKey, resourceType),
        { method: 'POST', body: JSON.stringify(params) }
      )
    },

    retrieve(setupKey: string, resourceKey: string) {
      return request<ProvisioningSetupResource>(
        `${resourcePath(setupKey, resourceType)}/${encodeURIComponent(resourceKey)}`
      )
    },

    update(
      setupKey: string,
      resourceKey: string,
      params: ProvisioningSetupResourceUpdateParams
    ) {
      return request<ProvisioningSetupResource>(
        `${resourcePath(setupKey, resourceType)}/${encodeURIComponent(resourceKey)}`,
        { method: 'PATCH', body: JSON.stringify(params) }
      )
    },

    delete(setupKey: string, resourceKey: string) {
      return request<DeletedProvisioningSetupResource>(
        `${resourcePath(setupKey, resourceType)}/${encodeURIComponent(resourceKey)}`,
        { method: 'DELETE' }
      )
    },
  }
}

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

  resources: {
    forType: resourceClient,
    workspaceDefaults: resourceClient('workspace'),
    currencies: resourceClient('currency'),
    paymentModes: resourceClient('payment_mode'),
    paymentTerms: resourceClient('payment_term'),
    invoicePreferences: resourceClient('invoice_preference'),
    taxAuthorities: resourceClient('tax_authority'),
    taxJurisdictions: resourceClient('tax_jurisdiction'),
    taxCodes: resourceClient('tax_code'),
    taxRates: resourceClient('tax_rate'),
  },
}
