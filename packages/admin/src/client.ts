/**
 * Admin API client factory — Core/platform admin only.
 *
 * Composes the internal-key-tier resource modules over one shared runtime.
 * Product administration (billing, storage, widgets, couriers) is composed
 * by `@876/client/server` under the unified `$876` root; this package
 * exposes only Core/platform resources.
 */

import { buildAdminRuntime } from './runtime'
import { createAdminAddressesResource } from './resources/addresses'
import { createAdminApiKeysResource } from './resources/api-keys'
import { createAdminAppsResource } from './resources/apps'
import { createAdminAuditEventsResource } from './resources/audit-events'
import { createAdminAuthResource } from './resources/auth'
import { createAdminAuthAttemptsResource } from './resources/auth-attempts'
import { createAdminDevicesResource } from './resources/devices'
import { createAdminFeaturesResource } from './resources/features'
import { createAdminMembershipsResource } from './resources/memberships'
import { createAdminModulesResource } from './resources/modules'
import { createAdminOnboardingResource } from './resources/onboarding'
import { createAdminOrgsResource } from './resources/orgs'
import { createAdminPricesResource } from './resources/prices'
import { createAdminProductsResource } from './resources/products'
import { createAdminProvisioningResource } from './resources/provisioning'
import { createAdminReservedUsernamesResource } from './resources/reserved-usernames'
import { createAdminSessionsResource } from './resources/sessions'
import { createAdminUsersResource } from './resources/users'
import { createAdminBillingAccountsResource } from './resources/billing-accounts'
import { createAdminCommunicationsResource } from './resources/communications'
import { createAdminSubscriptionsResource } from './resources/subscriptions'
import type { AdminPlatformClientOptions } from './types'

export type Admin876ClientOptions = AdminPlatformClientOptions

export function create876AdminClient(options: Admin876ClientOptions = {}) {
  const runtime = buildAdminRuntime(options)
  const { identifications, ...users } = createAdminUsersResource(runtime)
  const {
    features: appFeatures,
    subscriptions: appSubscriptions,
    ...apps
  } = createAdminAppsResource(runtime)
  const { orgs: organizationFeatures, ...features } =
    createAdminFeaturesResource(runtime)
  const {
    locations,
    contacts,
    departments,
    employees,
    subscriptions: organizationSubscriptions,
    permissions,
    roles,
    members: organizationMembers,
    appAssignments,
    listMemberships: _listMemberships,
    createMembership: _createMembership,
    listInvites,
    createInvite,
    revokeInvite,
    ...organizations
  } = createAdminOrgsResource(runtime)
  const subscriptions = createAdminSubscriptionsResource(runtime)
  const communications = createAdminCommunicationsResource(runtime)

  return {
    auditEvents: createAdminAuditEventsResource(runtime),
    messages: communications.messages,
    calls: communications.calls,
    phoneLookups: communications.phoneLookups,
    users,
    identifications,
    auth: createAdminAuthResource(runtime),
    authAttempts: createAdminAuthAttemptsResource(runtime),
    devices: createAdminDevicesResource(runtime),
    sessions: createAdminSessionsResource(runtime),
    apps,
    appFeatures,
    appSubscriptions,
    features,
    organizationFeatures,
    apiKeys: createAdminApiKeysResource(runtime),
    organizations: {
      ...organizations,
      // Organization-scoped entitlement: org -> app access relationship (GET /organizations/{id}/apps)
      // Distinct from top-level billing subscriptions (GET /billing/subscriptions) which are platform billing records by subscription ID.
      subscriptions: organizationSubscriptions,
    },
    locations,
    contacts,
    departments,
    employees,
    permissions,
    roles,
    organizationMembers,
    appAssignments,
    invites: {
      list: listInvites,
      create: createInvite,
      revoke: revokeInvite,
    },
    prices: createAdminPricesResource(runtime),
    products: createAdminProductsResource(runtime),
    onboarding: createAdminOnboardingResource(runtime),
    provisioning: createAdminProvisioningResource(runtime),
    memberships: createAdminMembershipsResource(runtime),
    modules: createAdminModulesResource(runtime),
    addresses: createAdminAddressesResource(runtime),
    reservedUsernames: createAdminReservedUsernamesResource(runtime),
    billingAccounts: createAdminBillingAccountsResource(runtime),
    subscriptions,
  }
}

export type Admin876Client = ReturnType<typeof create876AdminClient>
