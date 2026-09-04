import 'server-only'

import { create876CrmClient } from './client'
import { createOperatorRequestsResource } from './resources/operator-requests'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

/** 876 operator access to CRM. CRM currently shares the internal-key route with service callers. */
export function create876CrmOperatorClient(options: ClientOptions = {}) {
  const client = create876CrmClient(options)
  const operatorRequests = createOperatorRequestsResource(buildRuntime(options))
  return {
    ...client,
    requests: {
      ...client.requests,
      listAcrossOrganizations: operatorRequests.list,
    },
  }
}

export type CrmOperatorClient = ReturnType<typeof create876CrmOperatorClient>
export type CrmOperatorClientOptions = ClientOptions
