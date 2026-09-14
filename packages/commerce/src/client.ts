import 'server-only'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

/** Commerce has no resources until its first owned capability is implemented. */
export function create876CommerceClient(options: ClientOptions = {}) {
  return { runtime: buildRuntime(options) }
}
export type CommerceClient = ReturnType<typeof create876CommerceClient>
