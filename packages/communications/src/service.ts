import 'server-only'

import { create876CommunicationsClient } from './client'
import type { ClientOptions } from './types'

/** First-party 876 service access to the Communications internal boundary. */
export function create876CommunicationsServiceClient(
  options: ClientOptions = {}
) {
  return create876CommunicationsClient(options)
}

export type CommunicationsServiceClient = ReturnType<
  typeof create876CommunicationsServiceClient
>
export type CommunicationsServiceClientOptions = ClientOptions
