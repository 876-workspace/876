import 'server-only'

import { createCustomersResource } from './resources/customers'
import { createRequestsResource } from './resources/requests'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

export function create876CrmClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)

  return {
    customers: createCustomersResource(runtime),
    requests: createRequestsResource(runtime),
  }
}

export type CrmClient = ReturnType<typeof create876CrmClient>
