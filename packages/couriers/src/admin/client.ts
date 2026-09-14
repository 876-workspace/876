import { createTenantsResource } from './resources/tenants'
import { createBranchesResource } from './resources/branches'
import { createAddressesResource } from './resources/addresses'
import { createCustomersResource } from './resources/customers'
import { createMailboxesResource } from './resources/mailboxes'
import { createPackageCategoriesResource } from './resources/package-categories'
import { createPackagesResource } from './resources/packages'
import { createRolesResource } from './resources/roles'
import { createSettingsResource } from './resources/settings'
import { createTeamResource } from './resources/team'
import { createWarehousesResource } from './resources/warehouses'
import { buildAdminRuntime } from './runtime'
import type { AdminClientOptions } from '../types'

export function create876CouriersAdminClient(options: AdminClientOptions = {}) {
  const runtime = buildAdminRuntime(options)

  return {
    tenants: createTenantsResource(runtime),
    branches: createBranchesResource(runtime),
    warehouses: createWarehousesResource(runtime),
    addresses: createAddressesResource(runtime),
    customers: createCustomersResource(runtime),
    mailboxes: createMailboxesResource(runtime),
    packageCategories: createPackageCategoriesResource(runtime),
    packages: createPackagesResource(runtime),
    roles: createRolesResource(runtime),
    team: createTeamResource(runtime),
    settings: createSettingsResource(runtime),
  }
}

export type CouriersAdminClient = ReturnType<
  typeof create876CouriersAdminClient
>
