import 'server-only'

import { create876CrmClient } from './client'
import type { ClientOptions } from './types'

/** First-party 876 service access to CRM's current internal service boundary. */
export function create876CrmServiceClient(options: ClientOptions = {}) {
  return create876CrmClient(options)
}

export type CrmServiceClient = ReturnType<typeof create876CrmServiceClient>
export type CrmServiceClientOptions = ClientOptions
