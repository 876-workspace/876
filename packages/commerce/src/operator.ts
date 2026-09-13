import 'server-only'

import { create876CommerceClient } from './client'
import type { ClientOptions } from './types'

export function create876CommerceOperatorClient(options: ClientOptions = {}) {
  return create876CommerceClient(options)
}

export type CommerceOperatorClient = ReturnType<
  typeof create876CommerceOperatorClient
>
