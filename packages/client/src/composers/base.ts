import type { Admin876Client } from '@876/admin'
import type { SDK876Client } from '@876/sdk'
import { withAdmin } from '../internal/with-admin'

export function createCoreSurface(args: { platform: SDK876Client; admin: Admin876Client }): ReturnType<typeof createCoreSurfaceImpl> & {
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
export function createCoreSurface(args: { platform: SDK876Client; admin?: undefined }): ReturnType<typeof createCoreSurfaceImpl>
export function createCoreSurface(args: { platform: SDK876Client; admin?: Admin876Client }): unknown {
  return createCoreSurfaceImpl(args)
}

function createCoreSurfaceImpl({ platform, admin }: { platform: SDK876Client; admin?: Admin876Client }) {
  const base = {
    auth: platform.auth,
    oauth: platform.oauth,
    users: admin ? withAdmin({ me: platform.users }, admin.users) : { me: platform.users },
    organizations: admin ? withAdmin(platform.organizations, admin.organizations) : platform.organizations,
    apps: admin ? withAdmin(platform.apps, admin.apps) : platform.apps,
    memberships: admin ? withAdmin(platform.memberships, admin.memberships) : platform.memberships,
    features: admin ? withAdmin(platform.features, admin.features) : platform.features,
    entitlements: admin ? withAdmin(platform.subscriptions, admin.subscriptions) : platform.subscriptions,
    locations: platform.locations,
    contacts: platform.contacts,
    departments: platform.departments,
    employees: platform.employees,
    roles: admin ? withAdmin(platform.roles, admin.roles) : platform.roles,
    permissions: platform.permissions,
    organizationMembers: platform.organizationMembers,
    appAssignments: platform.appAssignments,
    invites: platform.invites,
  } as const

  if (!admin) return base

  return {
    ...base,
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
