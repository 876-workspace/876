import {
  create876CoreSessionClient,
  type CoreSessionClientOptions,
} from '@876/account/internal'

type CoreSession = ReturnType<typeof create876CoreSessionClient>

/** Organization/B2B projection of the Core API at signed-in session/app-key authority. */
export type WorkspaceSessionClient = {
  organizations: CoreSession['organizations']
  memberships: CoreSession['memberships']
  locations: CoreSession['locations']
  contacts: CoreSession['contacts']
  departments: CoreSession['departments']
  employees: CoreSession['employees']
  permissions: CoreSession['permissions']
  roles: CoreSession['roles']
  members: CoreSession['organizationMembers']
  appAssignments: CoreSession['appAssignments']
  appMemberships: CoreSession['appMemberships']
  apps: CoreSession['apps']
  invites: CoreSession['invites']
  entitlements: CoreSession['subscriptions']
  entitlementPlans: CoreSession['products']
  features: CoreSession['features']
}

/** Organization/B2B projection of the Core API at signed-in session/app-key authority. */
export function create876WorkspaceSessionClient(
  options: CoreSessionClientOptions = {}
): WorkspaceSessionClient {
  const core = create876CoreSessionClient(options)

  return {
    organizations: core.organizations,
    memberships: core.memberships,
    locations: core.locations,
    contacts: core.contacts,
    departments: core.departments,
    employees: core.employees,
    permissions: core.permissions,
    roles: core.roles,
    members: core.organizationMembers,
    appAssignments: core.appAssignments,
    appMemberships: core.appMemberships,
    apps: core.apps,
    invites: core.invites,
    entitlements: core.subscriptions,
    entitlementPlans: core.products,
    features: core.features,
  }
}

export type { CoreSessionClientOptions as WorkspaceSessionClientOptions }
