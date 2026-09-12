import 'server-only'

import {
  create876CrmServiceClient,
  type CrmServiceClient,
} from '@876/crm/service'

let client: CrmServiceClient | undefined

/** Invoice's narrowly scoped CRM service capability. */
export function getCrm() {
  if (client) return client

  // A missing credential is reported by the transport as `crm/not-configured`,
  // so a route renders a CRM error value instead of crashing into an HTML 500.
  client = create876CrmServiceClient({
    baseUrl: process.env.CRM_API_URL?.trim(),
    serviceApp: process.env.CRM_SERVICE_APP?.trim() ?? '',
    serviceKey: process.env.CRM_SERVICE_KEY?.trim(),
  })
  return client
}
