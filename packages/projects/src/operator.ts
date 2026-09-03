import 'server-only'

import { create876ProjectsClient } from './client'
import type { ClientOptions } from './types'

/** 876 operator access to Projects. Projects currently shares the internal-key route with service callers. */
export function create876ProjectsOperatorClient(options: ClientOptions = {}) {
  return create876ProjectsClient(options)
}

export type ProjectsOperatorClient = ReturnType<
  typeof create876ProjectsOperatorClient
>
export type ProjectsOperatorClientOptions = ClientOptions
