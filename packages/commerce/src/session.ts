import 'server-only'

import { create876CommerceClient } from './client'
import type { ClientOptions } from './types'

export function create876CommerceSessionClient(options: ClientOptions = {}) {
  return create876CommerceClient(options)
}

export type CommerceSessionClient = ReturnType<
  typeof create876CommerceSessionClient
>
