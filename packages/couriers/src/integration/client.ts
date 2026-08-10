import { createTenantsResource } from './resources/tenants'
import { buildIntegrationRuntime } from './runtime'
import type { IntegrationClientOptions } from '../types'

export function create876CouriersIntegrationClient(
  options: IntegrationClientOptions = {}
) {
  const runtime = buildIntegrationRuntime(options)

  return {
    tenants: createTenantsResource(runtime),
  }
}

export type CouriersIntegrationClient = ReturnType<
  typeof create876CouriersIntegrationClient
>
