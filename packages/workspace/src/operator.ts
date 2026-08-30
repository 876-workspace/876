import 'server-only'

import { create876CoreOperatorClient, type CoreOperatorClientOptions } from '@876/platform/internal'

/** Organization/B2B projection of the Core API at 876 operator authority. */
export function create876WorkspaceOperatorClient(options: CoreOperatorClientOptions = {}) {
  const core = create876CoreOperatorClient(options)

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
    appPermissions: core.appPermissions,
    appRoles: core.appRoles,
    orgAppRoles: core.orgAppRoles,
    appMemberships: core.appMemberships,
    apps: {
      ...core.apps,
      features: core.appFeatures,
      entitlements: core.appSubscriptions,
    },
    invites: core.invites,
    features: core.features,
    organizationFeatures: core.organizationFeatures,
    onboarding: core.onboarding,
    provisioning: core.provisioning,
    modules: core.modules,
    addresses: core.addresses,
    billingAccounts: core.billingAccounts,
  }
}

export type WorkspaceOperatorClient = ReturnType<typeof create876WorkspaceOperatorClient>
export type { CoreOperatorClientOptions as WorkspaceOperatorClientOptions }
