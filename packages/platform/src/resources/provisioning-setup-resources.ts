import type { ProvisioningResource } from '@876/core/types/provisioning'
import type {
  DeletedProvisioningSetupResource,
  ProvisioningSetupResourceCreateParams,
  ProvisioningSetupResourceType,
  ProvisioningSetupResourceUpdateParams,
} from '@876/core/types/provisioning-resources'

import { adminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import type { AdminListResponse } from '../types'

const resourcePath = (setupKey: string, resourceType: string) =>
  `/provisioning/setups/${encodeURIComponent(setupKey)}/resources/${encodeURIComponent(resourceType)}`

function createResourceClient(
  runtime: AdminRuntime,
  resourceType: ProvisioningSetupResourceType
) {
  return {
    list(setupKey: string) {
      return adminRequest<AdminListResponse<ProvisioningResource>>(runtime, {
        method: 'GET',
        path: resourcePath(setupKey, resourceType),
      })
    },

    create(setupKey: string, body: ProvisioningSetupResourceCreateParams) {
      return adminRequest<ProvisioningResource>(runtime, {
        method: 'POST',
        path: resourcePath(setupKey, resourceType),
        body,
      })
    },

    retrieve(setupKey: string, resourceKey: string) {
      return adminRequest<ProvisioningResource>(runtime, {
        method: 'GET',
        path: `${resourcePath(setupKey, resourceType)}/${encodeURIComponent(resourceKey)}`,
      })
    },

    update(
      setupKey: string,
      resourceKey: string,
      body: ProvisioningSetupResourceUpdateParams
    ) {
      return adminRequest<ProvisioningResource>(runtime, {
        method: 'PATCH',
        path: `${resourcePath(setupKey, resourceType)}/${encodeURIComponent(resourceKey)}`,
        body,
      })
    },

    delete(setupKey: string, resourceKey: string) {
      return adminRequest<DeletedProvisioningSetupResource>(runtime, {
        method: 'DELETE',
        path: `${resourcePath(setupKey, resourceType)}/${encodeURIComponent(resourceKey)}`,
      })
    },
  }
}

/**
 * Resource-level CRUD for the cards inside a named provisioning setup.
 *
 * The generic `forType()` entry keeps the catalog extensible. Named resources
 * cover the current finance cards so callers do not pass string literals for
 * established resource families.
 */
export function createAdminProvisioningSetupResourcesResource(
  runtime: AdminRuntime
) {
  return {
    forType(resourceType: ProvisioningSetupResourceType) {
      return createResourceClient(runtime, resourceType)
    },
    workspaceDefaults: createResourceClient(runtime, 'workspace'),
    currencies: createResourceClient(runtime, 'currency'),
    paymentModes: createResourceClient(runtime, 'payment_mode'),
    paymentTerms: createResourceClient(runtime, 'payment_term'),
    invoicePreferences: createResourceClient(runtime, 'invoice_preference'),
    taxAuthorities: createResourceClient(runtime, 'tax_authority'),
    taxJurisdictions: createResourceClient(runtime, 'tax_jurisdiction'),
    taxCodes: createResourceClient(runtime, 'tax_code'),
    taxRates: createResourceClient(runtime, 'tax_rate'),
  }
}
