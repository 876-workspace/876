import { createPortalResource } from './resources/portal'
import { createTenantsResource } from './resources/tenants'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

export function create876CouriersClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)

  return {
    tenants: createTenantsResource(runtime),
    portal: createPortalResource(runtime),
  }
}

export type CouriersClient = ReturnType<typeof create876CouriersClient>
