import { create876CoreSessionClient, type CoreSessionClientOptions } from '@876/account/internal'

/** Organization/B2B projection of the Core API at signed-in session/app-key authority. */
export function create876WorkspaceSessionClient(options: CoreSessionClientOptions = {}) {
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

export type WorkspaceSessionClient = ReturnType<typeof create876WorkspaceSessionClient>
export type { CoreSessionClientOptions as WorkspaceSessionClientOptions }
