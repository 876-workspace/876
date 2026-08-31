import 'server-only'

import { create876CrmClient } from './client'
import type { ClientOptions } from './types'

/** 876 operator access to CRM. CRM currently shares the internal-key route with service callers. */
export function create876CrmOperatorClient(options: ClientOptions = {}) {
  return create876CrmClient(options)
}

export type CrmOperatorClient = ReturnType<typeof create876CrmOperatorClient>
export type CrmOperatorClientOptions = ClientOptions
