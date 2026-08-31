import 'server-only'

import {
  create876CoreOperatorClient,
  type CoreOperatorClientOptions,
} from '@876/platform/internal'

type CoreOperator = ReturnType<typeof create876CoreOperatorClient>

/** Organization/B2B projection of the Core API at 876 operator authority. */
export type WorkspaceOperatorClient = {
  organizations: CoreOperator['organizations']
  memberships: CoreOperator['memberships']
  locations: CoreOperator['locations']
  contacts: CoreOperator['contacts']
  departments: CoreOperator['departments']
  employees: CoreOperator['employees']
  permissions: CoreOperator['permissions']
  roles: CoreOperator['roles']
  members: CoreOperator['organizationMembers']
  appAssignments: CoreOperator['appAssignments']
  appPermissions: CoreOperator['appPermissions']
  appRoles: CoreOperator['appRoles']
  orgAppRoles: CoreOperator['orgAppRoles']
  appMemberships: CoreOperator['appMemberships']
  apps: CoreOperator['apps'] & {
    features: CoreOperator['appFeatures']
    entitlements: CoreOperator['appSubscriptions']
  }
  invites: CoreOperator['invites']
  features: CoreOperator['features']
  organizationFeatures: CoreOperator['organizationFeatures']
  onboarding: CoreOperator['onboarding']
  provisioning: CoreOperator['provisioning']
  modules: CoreOperator['modules']
  addresses: CoreOperator['addresses']
  billingAccounts: CoreOperator['billingAccounts']
}

/** Organization/B2B projection of the Core API at 876 operator authority. */
export function create876WorkspaceOperatorClient(
  options: CoreOperatorClientOptions = {}
): WorkspaceOperatorClient {
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

export type { CoreOperatorClientOptions as WorkspaceOperatorClientOptions }
