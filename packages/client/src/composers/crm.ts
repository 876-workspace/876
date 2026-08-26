import { createServiceClients } from '../internal/create-service-clients'
import { requireCapability } from '../internal/require-capability'
import type { CrmServerClientOptions } from '../internal/types'
import { createCoreSurface } from './base'

export function createCrmClient(options: CrmServerClientOptions) {
  const services = createServiceClients(options)
  const core = createCoreSurface({ platform: services.platform })
  const crm = requireCapability(services.crm, 'crm')

  return {
    ...core,
    customerProfiles: crm.customers,
    requests: crm.requests,
    requestNotes: crm.requestNotes,
  }
}

export type Crm876Client = ReturnType<typeof createCrmClient>
