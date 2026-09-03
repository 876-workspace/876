import 'server-only'

import { create876ProjectsClient } from './client'
import type { ClientOptions } from './types'

/** First-party 876 service access to Projects' current internal service boundary. */
export function create876ProjectsServiceClient(options: ClientOptions = {}) {
  return create876ProjectsClient(options)
}

export type ProjectsServiceClient = ReturnType<
  typeof create876ProjectsServiceClient
>
export type ProjectsServiceClientOptions = ClientOptions
