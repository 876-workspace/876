import type { Admin876Client } from '@876/admin'
import type { SDK876Client } from '@876/sdk'
import { withAdmin, type WithAdmin } from '../internal/with-admin'

type SessionSurface = {
  retrieve: SDK876Client['auth']['getSession']
  list: SDK876Client['auth']['me']['listSessions']
  revoke: SDK876Client['auth']['me']['revokeSession']
}

type SessionNamespace = {
  me: SessionSurface
}

type AdminSessionSurface = Admin876Client['sessions'] & {
  me: SessionSurface
  admin: Admin876Client['sessions']
}

function createSessionSurface(platform: SDK876Client): SessionSurface {
  return {
    retrieve: platform.auth.getSession,
    list: platform.auth.me.listSessions,
    revoke: platform.auth.me.revokeSession,
  }
}

function createSessionNamespace(platform: SDK876Client): SessionNamespace {
  return { me: createSessionSurface(platform) }
}

function createAdminSessionSurface(
  platform: SDK876Client,
  sessions: Admin876Client['sessions']
): AdminSessionSurface {
  return {
    ...sessions,
    me: createSessionSurface(platform),
    admin: sessions,
  }
}

interface AdminResourceNamespaces {
  auditEvents: Admin876Client['auditEvents']
  addresses: Admin876Client['addresses']
  billingAccounts: Admin876Client['billingAccounts']
  appSubscriptions: Admin876Client['appSubscriptions']
  identifications: Admin876Client['identifications']
  messages: Admin876Client['messages']
  calls: Admin876Client['calls']
  phoneLookups: Admin876Client['phoneLookups']
}

/** The platform-only resource surface, without admin projections. */
export type CoreSurfaceBase = {
  auth: SDK876Client['auth']
  sessions: SessionNamespace
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
  mobileNumbers: SDK876Client['mobileNumbers']
  mobileNumberVerifications: SDK876Client['mobileNumberVerifications']
  entitlementPlans: SDK876Client['products']
}

/**
 * Admin-projected resource surface.
 *
 * Organization control-plane operations (provisioning, onboarding, modules,
 * organization feature grants, app assignment/entitlement administration) are
 * intentionally not composed here; they live on `workspace`. 876-operator
 * controls (API keys, auth attempts, devices, reserved usernames, app feature
 * wiring) live on `platform`.
 */
export type CoreSurfaceAdmin = Omit<
  CoreSurfaceBase,
  | 'users'
  | 'auditEvents'
  | 'organizations'
  | 'apps'
  | 'memberships'
  | 'features'
  | 'roles'
  | 'organizationMembers'
  | 'invites'
  | 'sessions'
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
  roles: WithAdmin<SDK876Client['roles'], Admin876Client['roles']>
  organizationMembers: WithAdmin<
    SDK876Client['organizationMembers'],
    Admin876Client['organizationMembers']
  >
  invites: WithAdmin<SDK876Client['invites'], Admin876Client['invites']>
  sessions: AdminSessionSurface
} & AdminResourceNamespaces

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
    sessions: createSessionNamespace(platform),
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
    mobileNumbers: platform.mobileNumbers,
    mobileNumberVerifications: platform.mobileNumberVerifications,
    entitlementPlans: platform.products,
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
    roles: withAdmin(platform.roles, admin.roles),
    organizationMembers: withAdmin(
      platform.organizationMembers,
      admin.organizationMembers
    ),
    invites: withAdmin(platform.invites, admin.invites),
    sessions: createAdminSessionSurface(platform, admin.sessions),
    auditEvents: admin.auditEvents,
    addresses: admin.addresses,
    billingAccounts: admin.billingAccounts,
    appSubscriptions: admin.appSubscriptions,
    identifications: admin.identifications,
    messages: admin.messages,
    calls: admin.calls,
    phoneLookups: admin.phoneLookups,
  }
}
