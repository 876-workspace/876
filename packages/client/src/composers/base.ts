import type { Admin876Client } from '@876/admin'
import type { SDK876Client } from '@876/sdk'
import { withAdmin, type WithAdmin } from '../internal/with-admin'

interface AdminNamespaces {
  auditEvents: Admin876Client['auditEvents']
  apiKeys: Admin876Client['apiKeys']
  modules: Admin876Client['modules']
  provisioning: Admin876Client['provisioning']
  onboarding: Admin876Client['onboarding']
  addresses: Admin876Client['addresses']
  reservedUsernames: Admin876Client['reservedUsernames']
  billingAccounts: Admin876Client['billingAccounts']
  authAttempts: Admin876Client['authAttempts']
  devices: Admin876Client['devices']
  sessions: Admin876Client['sessions']
  appFeatures: Admin876Client['appFeatures']
  appSubscriptions: Admin876Client['appSubscriptions']
  organizationFeatures: Admin876Client['organizationFeatures']
  identifications: Admin876Client['identifications']
  messages: Admin876Client['messages']
  calls: Admin876Client['calls']
  phoneLookups: Admin876Client['phoneLookups']
}

/** The platform-only core surface, without admin projections. */
export type CoreSurfaceBase = {
  auth: SDK876Client['auth']
  oauth: SDK876Client['oauth']
  oauthGrants: SDK876Client['oauthGrants']
  auditEvents: SDK876Client['auditEvents']
  users: { me: SDK876Client['users'] }
  organizations: SDK876Client['organizations']
  apps: SDK876Client['apps']
  memberships: SDK876Client['memberships']
  features: SDK876Client['features']
  entitlements: SDK876Client['subscriptions']
  locations: SDK876Client['locations']
  contacts: SDK876Client['contacts']
  departments: SDK876Client['departments']
  employees: SDK876Client['employees']
  roles: SDK876Client['roles']
  permissions: SDK876Client['permissions']
  organizationMembers: SDK876Client['organizationMembers']
  appAssignments: SDK876Client['appAssignments']
  invites: SDK876Client['invites']
  products: SDK876Client['products']
}

/**
 * The admin-projected core surface: shared resources keep their platform
 * methods alongside an `admin` namespace, and admin-only namespaces are
 * surfaced directly.
 */
export type CoreSurfaceAdmin = Omit<
  CoreSurfaceBase,
  | 'users'
  | 'auditEvents'
  | 'organizations'
  | 'apps'
  | 'memberships'
  | 'features'
  | 'entitlements'
  | 'roles'
> & {
  users: WithAdmin<{ me: SDK876Client['users'] }, Admin876Client['users']>
  organizations: WithAdmin<
    SDK876Client['organizations'],
    Admin876Client['organizations']
  >
  apps: WithAdmin<SDK876Client['apps'], Admin876Client['apps']>
  memberships: WithAdmin<
    SDK876Client['memberships'],
    Admin876Client['memberships']
  >
  features: WithAdmin<SDK876Client['features'], Admin876Client['features']>
  entitlements: WithAdmin<
    SDK876Client['subscriptions'],
    Admin876Client['subscriptions']
  >
  roles: WithAdmin<SDK876Client['roles'], Admin876Client['roles']>
} & AdminNamespaces

export function createCoreSurface(args: {
  platform: SDK876Client
  admin: Admin876Client
}): CoreSurfaceAdmin
export function createCoreSurface(args: {
  platform: SDK876Client
  admin?: undefined
}): CoreSurfaceBase
export function createCoreSurface(args: {
  platform: SDK876Client
  admin?: Admin876Client
}): CoreSurfaceBase | CoreSurfaceAdmin {
  const { platform, admin } = args
  if (!admin) return createCoreSurfaceBase(platform)
  return createCoreSurfaceAdmin(platform, admin)
}

function createCoreSurfaceBase(platform: SDK876Client): CoreSurfaceBase {
  return {
    auth: platform.auth,
    oauth: platform.oauth,
    oauthGrants: platform.oauthGrants,
    auditEvents: platform.auditEvents,
    users: { me: platform.users },
    organizations: platform.organizations,
    apps: platform.apps,
    memberships: platform.memberships,
    features: platform.features,
    entitlements: platform.subscriptions,
    locations: platform.locations,
    contacts: platform.contacts,
    departments: platform.departments,
    employees: platform.employees,
    roles: platform.roles,
    permissions: platform.permissions,
    organizationMembers: platform.organizationMembers,
    appAssignments: platform.appAssignments,
    invites: platform.invites,
    products: platform.products,
  }
}

function createCoreSurfaceAdmin(
  platform: SDK876Client,
  admin: Admin876Client
): CoreSurfaceAdmin {
  return {
    ...createCoreSurfaceBase(platform),
    users: withAdmin({ me: platform.users }, admin.users),
    organizations: withAdmin(platform.organizations, admin.organizations),
    apps: withAdmin(platform.apps, admin.apps),
    memberships: withAdmin(platform.memberships, admin.memberships),
    features: withAdmin(platform.features, admin.features),
    entitlements: withAdmin(platform.subscriptions, admin.subscriptions),
    roles: withAdmin(platform.roles, admin.roles),
    auditEvents: admin.auditEvents,
    apiKeys: admin.apiKeys,
    modules: admin.modules,
    provisioning: admin.provisioning,
    onboarding: admin.onboarding,
    addresses: admin.addresses,
    reservedUsernames: admin.reservedUsernames,
    billingAccounts: admin.billingAccounts,
    authAttempts: admin.authAttempts,
    devices: admin.devices,
    sessions: admin.sessions,
    appFeatures: admin.appFeatures,
    appSubscriptions: admin.appSubscriptions,
    organizationFeatures: admin.organizationFeatures,
    identifications: admin.identifications,
    messages: admin.messages,
    calls: admin.calls,
    phoneLookups: admin.phoneLookups,
  }
}
