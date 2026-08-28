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
    requestCategories: crm.requestCategories,
    requestPriorities: crm.requestPriorities,
    requestForms: crm.requestForms,
    requestFormSubmissions: crm.requestFormSubmissions,
    requestFormRequests: crm.requestFormRequests,
    requestNotes: crm.requestNotes,
    requestReminders: crm.requestReminders,
    requests: crm.requests,
    requestTasks: crm.requestTasks,
    teams: crm.teams,
  }
}

export type Crm876Client = ReturnType<typeof createCrmClient>
