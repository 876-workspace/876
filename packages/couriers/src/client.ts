import { createAddressesResource } from './resources/addresses'
import { createBranchesResource } from './resources/branches'
import { createCustomersResource } from './resources/customers'
import { createMailboxesResource } from './resources/mailboxes'
import { createMembershipsResource } from './resources/memberships'
import { createPackagesResource } from './resources/packages'
import { createPortalResource } from './resources/portal'
import { createRolesResource } from './resources/roles'
import { createTenantsResource } from './resources/tenants'
import { createWarehousesResource } from './resources/warehouses'
import { buildRuntime } from './runtime'
import type { ClientOptions } from './types'

export function create876CouriersClient(options: ClientOptions = {}) {
  const runtime = buildRuntime(options)
  return {
    tenants: createTenantsResource(runtime),
    portal: createPortalResource(runtime),
    customers: createCustomersResource(runtime),
    packages: createPackagesResource(runtime),
    branches: createBranchesResource(runtime),
    warehouses: createWarehousesResource(runtime),
    mailboxes: createMailboxesResource(runtime),
    addresses: createAddressesResource(runtime),
    roles: createRolesResource(runtime),
    memberships: createMembershipsResource(runtime),
  }
}

export type CouriersClient = ReturnType<typeof create876CouriersClient>
