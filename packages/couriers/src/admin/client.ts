import { createTenantsResource } from './resources/tenants'
import { createBranchesResource } from './resources/branches'
import { buildAdminRuntime } from './runtime'
import type { AdminClientOptions } from '../types'

export function create876CouriersAdminClient(options: AdminClientOptions = {}) {
  const runtime = buildAdminRuntime(options)

  return {
    tenants: createTenantsResource(runtime),
    branches: createBranchesResource(runtime),
  }
}

export type CouriersAdminClient = ReturnType<
  typeof create876CouriersAdminClient
>
