import 'server-only'

import { create876CommerceClient } from './client'
import type { ClientOptions } from './types'

export function create876CommerceServiceClient(options: ClientOptions = {}) {
  return create876CommerceClient(options)
}

export type CommerceServiceClient = ReturnType<
  typeof create876CommerceServiceClient
>
